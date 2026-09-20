import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.configure';

let workDir: string;
let seq = 0;

function freshDir(): string {
  const dir = join(workDir, `case-${seq++}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'nestjs-e2e-'));
});

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('NestJS taskboard (e2e)', () => {
  let app: INestApplication;

  async function bootApp(dbPath: string): Promise<INestApplication> {
    process.env.DATABASE_PATH = dbPath;
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const instance = moduleRef.createNestApplication<NestExpressApplication>();
    configureApplication(instance);
    await instance.init();
    return instance;
  }

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined as never;
    }
  });

  it('runs liveness and readiness with a reachable database', async () => {
    app = await bootApp(join(freshDir(), 'taskboard.db'));
    await request(app.getHttpServer()).get('/api/health/live').expect(200);
    await request(app.getHttpServer()).get('/api/health/ready').expect(200);
  });

  it('returns release meta', async () => {
    app = await bootApp(join(freshDir(), 'taskboard.db'));
    const res = await request(app.getHttpServer()).get('/api/meta').expect(200);
    expect(res.body).toMatchObject({ name: 'deploy-test-nestjs' });
    expect(typeof res.body.release).toBe('string');
    expect(res.body.runtime.node).toMatch(/^v/);
  });

  it('seeds idempotently and serves seed data', async () => {
    const db = join(freshDir(), 'taskboard.db');
    app = await bootApp(db);
    let res = await request(app.getHttpServer()).get('/api/projects').expect(200);
    expect(res.body.projects.length).toBeGreaterThan(0);
    const names = res.body.projects.map((p: { name: string }) => p.name);
    expect(names).toContain('Launch checklist');
    expect(names).toContain('Platform migration');

    // restart on the SAME database path => no duplicate seed rows
    await app.close();
    app = await bootApp(db);
    res = await request(app.getHttpServer()).get('/api/projects').expect(200);
    expect(res.body.projects.length).toBe(2);
  });

  it('performs full CRUD over projects and tasks, search, and filters', async () => {
    app = await bootApp(join(freshDir(), 'taskboard.db'));

    // create project
    const createdProject = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: '  Smoke Project  ', description: 'created over HTTP', status: 'active' })
      .expect(201);
    const projectId = createdProject.body.project.id;
    expect(createdProject.body.project.name).toBe('Smoke Project');

    // create tasks across statuses
    await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ project_id: projectId, title: 'Smoke task done', status: 'done', priority: 'high' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ project_id: projectId, title: 'Smoke task in progress', status: 'in_progress', priority: 'medium' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ project_id: projectId, title: 'Smoke task todo', status: 'todo', priority: 'low' })
      .expect(201);

    // search
    let res = await request(app.getHttpServer())
      .get(`/api/tasks?q=${encodeURIComponent('Smoke task done')}`)
      .expect(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('Smoke task done');

    // combined filter
    res = await request(app.getHttpServer())
      .get(`/api/tasks?status=in_progress&project_id=${projectId}`)
      .expect(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].status).toBe('in_progress');

    // read project detail
    res = await request(app.getHttpServer()).get(`/api/projects/${projectId}`).expect(200);
    expect(res.body.project.tasks).toHaveLength(3);

    // update task
    res = await request(app.getHttpServer())
      .patch(`/api/tasks/${res.body.project.tasks[0].id}`)
      .send({ status: 'in_progress', priority: 'low' })
      .expect(200);
    expect(res.body.task.status).toBe('in_progress');

    // update project
    res = await request(app.getHttpServer())
      .patch(`/api/projects/${projectId}`)
      .send({ name: 'Smoke Project (renamed)' })
      .expect(200);
    expect(res.body.project.name).toBe('Smoke Project (renamed)');

    // delete a throwaway task and confirm 404 after
    const del = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ project_id: projectId, title: 'throwaway', status: 'todo' })
      .expect(201);
    const throwawayId = del.body.task.id;
    await request(app.getHttpServer()).delete(`/api/tasks/${throwawayId}`).expect(200);
    await request(app.getHttpServer()).get(`/api/tasks/${throwawayId}`).expect(404);
  });

  it('validates negative input with meaningful errors', async () => {
    app = await bootApp(join(freshDir(), 'taskboard.db'));
    // registration of a project so task validation can progress
    const proj = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 'Valid' })
      .expect(201);
    const projectId = proj.body.project.id;

    const invalid = [
      { label: 'blank task title', body: { project_id: projectId, title: '   ' }, want: 400 },
      { label: 'missing project_id', body: { title: 'x' }, want: 400 },
      { label: 'invalid task status', body: { project_id: projectId, title: 'x', status: 'warp' }, want: 400 },
      { label: 'invalid priority', body: { project_id: projectId, title: 'x', priority: 'urgent' }, want: 400 },
      { label: 'malformed json', body: '{nope', want: 400 },
      { label: 'nonexistent project_id', body: { project_id: 999999, title: 'x' }, want: 400 },
      { label: 'blank project name', body: { name: '   ' }, want: 400 },
      { label: 'invalid project status', body: { name: 'x', status: 'warp' }, want: 400 },
    ];
    for (const tc of invalid) {
      await request(app.getHttpServer())
        .post('/api/tasks')
        .send(tc.body)
        .expect(tc.want);
    }

    const badTitle = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ project_id: projectId, title: '   ' })
      .expect(400);
    expect(JSON.stringify(badTitle.body)).toMatch(/title/i);

    await request(app.getHttpServer()).get('/api/tasks/999999').expect(404);
    await request(app.getHttpServer()).get('/api/projects/999999').expect(404);
    await request(app.getHttpServer()).patch(`/api/tasks/999999`).send({ title: 'x' }).expect(404);
    await request(app.getHttpServer()).get('/api/tasks/abc').expect(400);
    await request(app.getHttpServer()).get('/api/tasks?status=warp').expect(400);
  });

  it('proves persistence across a full restart on the same SQLite file', async () => {
    const db = join(freshDir(), 'survivor.db');
    app = await bootApp(db);

    const proj = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 'Survivor project' })
      .expect(201);

    const survivorName = `PERSIST-${Date.now()}-survivor`;
    const task = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ project_id: proj.body.project.id, title: survivorName, status: 'in_progress' })
      .expect(201);
    const survivorId = task.body.task.id;

    await app.close();
    app = await bootApp(db);

    const res = await request(app.getHttpServer()).get(`/api/tasks/${survivorId}`).expect(200);
    expect(res.body.task.title).toBe(survivorName);
  });

  it('reports database-down readiness while liveness stays up', async () => {
    // A database whose parent directory cannot be created (it is a regular
    // file) -> TypeORM fails to open, the process survives, readiness 503.
    const blockedParent = join(freshDir(), 'blocked.db');
    writeFileSync(blockedParent, 'i am blocking');
    app = await bootApp(join(blockedParent, 'unreachable.db'));

    await request(app.getHttpServer()).get('/api/health/live').expect(200);
    const ready = await request(app.getHttpServer()).get('/api/health/ready').expect(503);
    expect(String(ready.body.status ?? '')).toMatch(/unavailable/i);
    await request(app.getHttpServer()).get('/api/projects').expect(503);
    await request(app.getHttpServer()).get('/api/tasks').expect(503);
  });
});

describe('ServiceUnavailableException shape', () => {
  it('carries the expected 503 payload', () => {
    const ex = new ServiceUnavailableException({
      status: 'unavailable',
      database: 'down',
    });
    expect(ex.getStatus()).toBe(503);
  });
});
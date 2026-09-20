import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('seed_flag')
export class SeedFlag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text' })
  appliedAt!: string;
}
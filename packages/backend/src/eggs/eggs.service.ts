import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NestEntity } from '../database/entities/nest.entity';
import { EggEntity } from '../database/entities/egg.entity';
import { EggVariableEntity } from '../database/entities/egg-variable.entity';
import { CreateNestDto, CreateEggDto, UpdateEggDto } from './dto';

@Injectable()
export class EggsService {
  constructor(
    @InjectRepository(NestEntity)
    private readonly nestRepo: Repository<NestEntity>,
    @InjectRepository(EggEntity)
    private readonly eggRepo: Repository<EggEntity>,
    @InjectRepository(EggVariableEntity)
    private readonly eggVariableRepo: Repository<EggVariableEntity>,
  ) {}

  async findAllNests() {
    return this.nestRepo.find({
      relations: ['eggs'],
      order: { name: 'ASC' },
    });
  }

  async findNestById(id: string) {
    const nest = await this.nestRepo.findOne({
      where: { id },
      relations: ['eggs'],
    });
    if (!nest) {
      throw new NotFoundException('Nest not found');
    }
    return nest;
  }

  async createNest(dto: CreateNestDto) {
    const nest = this.nestRepo.create(dto);
    return this.nestRepo.save(nest);
  }

  async findAllEggs(nestId?: string) {
    const where = nestId ? { nestId } : undefined;
    return this.eggRepo.find({
      where,
      relations: ['nest', 'variables'],
      order: { name: 'ASC' },
    });
  }

  async findEggById(id: string) {
    const egg = await this.eggRepo.findOne({
      where: { id },
      relations: ['nest', 'variables'],
    });
    if (!egg) {
      throw new NotFoundException('Egg not found');
    }
    return egg;
  }

  async createEgg(dto: CreateEggDto) {
    const nest = await this.nestRepo.findOne({ where: { id: dto.nestId } });
    if (!nest) {
      throw new NotFoundException('Nest not found');
    }
    const { variables, ...eggData } = dto;
    const egg = this.eggRepo.create(eggData);
    const savedEgg = await this.eggRepo.save(egg);

    if (variables?.length) {
      const varEntities = variables.map((v) =>
        this.eggVariableRepo.create({ ...v, eggId: savedEgg.id }),
      );
      savedEgg.variables = await this.eggVariableRepo.save(varEntities);
    }

    return savedEgg;
  }

  async updateEgg(id: string, dto: UpdateEggDto) {
    const egg = await this.eggRepo.findOne({ where: { id } });
    if (!egg) {
      throw new NotFoundException('Egg not found');
    }
    const { variables, ...eggData } = dto;
    Object.assign(egg, eggData);
    const savedEgg = await this.eggRepo.save(egg);

    if (variables !== undefined) {
      await this.eggVariableRepo.delete({ eggId: id });
      const varEntities = variables.map((v) =>
        this.eggVariableRepo.create({ ...v, eggId: id }),
      );
      savedEgg.variables = await this.eggVariableRepo.save(varEntities);
    }

    return savedEgg;
  }

  async deleteEgg(id: string) {
    const egg = await this.eggRepo.findOne({ where: { id } });
    if (!egg) {
      throw new NotFoundException('Egg not found');
    }
    await this.eggRepo.remove(egg);
  }

  async importEgg(json: Record<string, any>) {
    const egg = this.eggRepo.create({
      nestId: json.nestId,
      name: json.name,
      description: json.description || '',
      author: json.author || '',
      dockerImage: json.dockerImage,
      dockerImages: json.dockerImages || {},
      startup: json.startup,
      configFiles: json.configFiles,
      configStartup: json.configStartup,
      configStop: json.configStop,
      configLogs: json.configLogs,
      scriptInstall: json.scriptInstall || '',
      scriptEntry: json.scriptEntry || 'bash',
      scriptContainer: json.scriptContainer || 'alpine:latest',
      copyScriptFrom: json.copyScriptFrom,
    });
    const savedEgg = await this.eggRepo.save(egg);

    if (json.variables?.length) {
      const varEntities = json.variables.map((v: any) =>
        this.eggVariableRepo.create({
          eggId: savedEgg.id,
          name: v.name,
          description: v.description || '',
          envVariable: v.envVariable,
          defaultValue: v.defaultValue || '',
          userViewable: v.userViewable ?? true,
          userEditable: v.userEditable ?? true,
          rules: v.rules || '',
        }),
      );
      savedEgg.variables = await this.eggVariableRepo.save(varEntities);
    }

    return savedEgg;
  }

  async exportEgg(id: string) {
    const egg = await this.findEggById(id);
    return {
      name: egg.name,
      description: egg.description,
      author: egg.author,
      dockerImage: egg.dockerImage,
      dockerImages: egg.dockerImages,
      startup: egg.startup,
      configFiles: egg.configFiles,
      configStartup: egg.configStartup,
      configStop: egg.configStop,
      configLogs: egg.configLogs,
      scriptInstall: egg.scriptInstall,
      scriptEntry: egg.scriptEntry,
      scriptContainer: egg.scriptContainer,
      copyScriptFrom: egg.copyScriptFrom,
      variables: egg.variables?.map((v) => ({
        name: v.name,
        description: v.description,
        envVariable: v.envVariable,
        defaultValue: v.defaultValue,
        userViewable: v.userViewable,
        userEditable: v.userEditable,
        rules: v.rules,
      })) || [],
      nestId: egg.nestId,
      _exportVersion: '1.0',
    };
  }
}

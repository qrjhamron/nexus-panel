import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { NestEntity } from './entities/nest.entity';
import { EggEntity } from './entities/egg.entity';
import { EggVariableEntity } from './entities/egg-variable.entity';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'nexus',
    password: process.env.DB_PASSWORD || 'nexus',
    database: process.env.DB_DATABASE || 'nexus',
    entities: [UserEntity, NestEntity, EggEntity, EggVariableEntity],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('Database connected. Running seed...');

  const userRepo = dataSource.getRepository(UserEntity);
  const nestRepo = dataSource.getRepository(NestEntity);
  const eggRepo = dataSource.getRepository(EggEntity);
  const eggVarRepo = dataSource.getRepository(EggVariableEntity);

  // ── Root Admin ──
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nexus.local';
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'changeme';

  const existingAdmin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPass, 12);
    const admin = userRepo.create({
      email: adminEmail,
      username: adminUser,
      password: hashedPassword,
      rootAdmin: true,
    });
    await userRepo.save(admin);
    console.log(`Created root admin user: ${adminEmail} / ${adminPass}`);
  } else {
    console.log('Root admin user already exists, skipping.');
  }

  // ── Default Nests ──
  const nestData = [
    { name: 'Minecraft', author: 'support@nexus.local', description: 'Minecraft game server eggs' },
    { name: 'Bot Hosting', author: 'support@nexus.local', description: 'Bot hosting eggs for Node.js and Python' },
    { name: 'Custom', author: 'support@nexus.local', description: 'Custom and generic eggs' },
  ];

  const nests: Record<string, NestEntity> = {};
  for (const nd of nestData) {
    let nest = await nestRepo.findOne({ where: { name: nd.name } });
    if (!nest) {
      nest = nestRepo.create(nd);
      nest = await nestRepo.save(nest);
      console.log(`Created nest: ${nd.name}`);
    } else {
      console.log(`Nest "${nd.name}" already exists, skipping.`);
    }
    nests[nd.name] = nest;
  }

  // ── Default Eggs ──
  const eggData = [
    {
      nestName: 'Minecraft',
      name: 'Minecraft Paper',
      author: 'support@nexus.local',
      description: 'Paper is a high-performance fork of Spigot.',
      dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
      dockerImages: { 'Java 21': 'ghcr.io/pterodactyl/yolks:java_21', 'Java 17': 'ghcr.io/pterodactyl/yolks:java_17' },
      startup: 'java -Xms128M -XX:+UseG1GC -jar {{SERVER_JARFILE}}',
      configStop: 'stop',
      scriptInstall: [
        '#!/bin/bash',
        'cd /mnt/server',
        'if [ "${BUILD_NUMBER}" == "latest" ]; then',
        '  BUILD_NUMBER=$(curl -s "https://api.papermc.io/v2/projects/paper/versions/${MC_VERSION}/builds" | jq -r ".builds[-1].build")',
        'fi',
        'curl -o ${SERVER_JARFILE} "https://api.papermc.io/v2/projects/paper/versions/${MC_VERSION}/builds/${BUILD_NUMBER}/downloads/paper-${MC_VERSION}-${BUILD_NUMBER}.jar"',
        'echo "eula=true" > eula.txt',
      ].join('\n'),
      scriptEntry: 'bash',
      scriptContainer: 'ghcr.io/pterodactyl/installers:alpine',
      variables: [
        { name: 'Server Jar File', description: 'The name of the server jar', envVariable: 'SERVER_JARFILE', defaultValue: 'server.jar', rules: 'required|string' },
        { name: 'Minecraft Version', description: 'The version of Minecraft to install', envVariable: 'MC_VERSION', defaultValue: 'latest', rules: 'required|string' },
        { name: 'Build Number', description: 'The Paper build number', envVariable: 'BUILD_NUMBER', defaultValue: 'latest', rules: 'required|string' },
      ],
    },
    {
      nestName: 'Minecraft',
      name: 'Minecraft Vanilla',
      author: 'support@nexus.local',
      description: 'The official Minecraft server.',
      dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
      dockerImages: { 'Java 21': 'ghcr.io/pterodactyl/yolks:java_21', 'Java 17': 'ghcr.io/pterodactyl/yolks:java_17' },
      startup: 'java -Xms128M -XX:+UseG1GC -jar {{SERVER_JARFILE}}',
      configStop: 'stop',
      scriptInstall: [
        '#!/bin/bash',
        'cd /mnt/server',
        'MANIFEST_URL=$(curl -s https://launchermeta.mojang.com/mc/game/version_manifest.json | jq -r ".versions[] | select(.id == \\"${MC_VERSION}\\") | .url")',
        'SERVER_URL=$(curl -s "$MANIFEST_URL" | jq -r ".downloads.server.url")',
        'curl -o ${SERVER_JARFILE} "$SERVER_URL"',
        'echo "eula=true" > eula.txt',
      ].join('\n'),
      scriptEntry: 'bash',
      scriptContainer: 'ghcr.io/pterodactyl/installers:alpine',
      variables: [
        { name: 'Server Jar File', description: 'The name of the server jar', envVariable: 'SERVER_JARFILE', defaultValue: 'server.jar', rules: 'required|string' },
        { name: 'Minecraft Version', description: 'The version of Minecraft to install', envVariable: 'MC_VERSION', defaultValue: 'latest', rules: 'required|string' },
      ],
    },
    {
      nestName: 'Bot Hosting',
      name: 'Node.js Generic',
      author: 'support@nexus.local',
      description: 'A generic Node.js application egg.',
      dockerImage: 'ghcr.io/pterodactyl/yolks:nodejs_21',
      dockerImages: { 'Node.js 21': 'ghcr.io/pterodactyl/yolks:nodejs_21', 'Node.js 20': 'ghcr.io/pterodactyl/yolks:nodejs_20' },
      startup: 'node {{MAIN_FILE}}',
      configStop: '^C',
      scriptInstall: [
        '#!/bin/bash',
        'cd /mnt/server',
        'if [ -f package.json ]; then',
        '  npm install --production',
        'fi',
      ].join('\n'),
      scriptEntry: 'bash',
      scriptContainer: 'ghcr.io/pterodactyl/yolks:nodejs_21',
      variables: [
        { name: 'Main File', description: 'The main file to run', envVariable: 'MAIN_FILE', defaultValue: 'index.js', rules: 'required|string' },
        { name: 'Node.js Version', description: 'Node.js version', envVariable: 'NODEJS_VERSION', defaultValue: '21', rules: 'required|string' },
      ],
    },
    {
      nestName: 'Bot Hosting',
      name: 'Python Generic',
      author: 'support@nexus.local',
      description: 'A generic Python application egg.',
      dockerImage: 'ghcr.io/pterodactyl/yolks:python_3.12',
      dockerImages: { 'Python 3.12': 'ghcr.io/pterodactyl/yolks:python_3.12', 'Python 3.11': 'ghcr.io/pterodactyl/yolks:python_3.11' },
      startup: 'python {{MAIN_FILE}}',
      configStop: '^C',
      scriptInstall: [
        '#!/bin/bash',
        'cd /mnt/server',
        'if [ -f requirements.txt ]; then',
        '  pip install -r requirements.txt',
        'fi',
      ].join('\n'),
      scriptEntry: 'bash',
      scriptContainer: 'ghcr.io/pterodactyl/yolks:python_3.12',
      variables: [
        { name: 'Main File', description: 'The main Python file to run', envVariable: 'MAIN_FILE', defaultValue: 'main.py', rules: 'required|string' },
        { name: 'Additional Packages', description: 'Additional pip packages to install', envVariable: 'PY_PACKAGES', defaultValue: '', rules: 'nullable|string' },
      ],
    },
    {
      nestName: 'Custom',
      name: 'Generic Script',
      author: 'support@nexus.local',
      description: 'A generic script egg using Alpine Linux.',
      dockerImage: 'alpine:latest',
      dockerImages: { 'Alpine Latest': 'alpine:latest' },
      startup: 'sh {{STARTUP_FILE}}',
      configStop: '^C',
      scriptInstall: [
        '#!/bin/bash',
        'cd /mnt/server',
        'mkdir -p /mnt/server',
      ].join('\n'),
      scriptEntry: 'bash',
      scriptContainer: 'alpine:latest',
      variables: [
        { name: 'Startup File', description: 'The startup script to run', envVariable: 'STARTUP_FILE', defaultValue: 'start.sh', rules: 'required|string' },
      ],
    },
  ];

  for (const ed of eggData) {
    const nest = nests[ed.nestName];
    const existingEgg = await eggRepo.findOne({
      where: { name: ed.name, nestId: nest.id },
    });
    if (!existingEgg) {
      const egg = eggRepo.create({
        nestId: nest.id,
        name: ed.name,
        author: ed.author,
        description: ed.description,
        dockerImage: ed.dockerImage,
        dockerImages: ed.dockerImages,
        startup: ed.startup,
        configStop: ed.configStop,
        scriptInstall: ed.scriptInstall,
        scriptEntry: ed.scriptEntry,
        scriptContainer: ed.scriptContainer,
      });
      const savedEgg = await eggRepo.save(egg);

      for (const v of ed.variables) {
        const variable = eggVarRepo.create({
          eggId: savedEgg.id,
          name: v.name,
          description: v.description,
          envVariable: v.envVariable,
          defaultValue: v.defaultValue,
          rules: v.rules,
          userViewable: true,
          userEditable: true,
        });
        await eggVarRepo.save(variable);
      }
      console.log(`Created egg: ${ed.name} with ${ed.variables.length} variables`);
    } else {
      console.log(`Egg "${ed.name}" already exists, skipping.`);
    }
  }

  console.log('Seed completed successfully!');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

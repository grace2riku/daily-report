import { PrismaClient, Role, ReportStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('Seeding database...');

  // 営業担当者のシードデータ
  const adminPassword = await hashPassword('admin123');
  const managerPassword = await hashPassword('manager123');
  const memberPassword = await hashPassword('member123');

  // 管理者
  const admin = await prisma.salesPerson.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      employeeCode: 'EMP001',
      name: '管理者 太郎',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: Role.admin,
      isActive: true,
    },
  });

  // 上長（マネージャー）
  const manager = await prisma.salesPerson.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      employeeCode: 'EMP002',
      name: '佐藤 課長',
      email: 'manager@example.com',
      passwordHash: managerPassword,
      role: Role.manager,
      isActive: true,
    },
  });

  // 一般営業担当者1
  const member1 = await prisma.salesPerson.upsert({
    where: { email: 'yamada@example.com' },
    update: {},
    create: {
      employeeCode: 'EMP003',
      name: '山田 太郎',
      email: 'yamada@example.com',
      passwordHash: memberPassword,
      role: Role.member,
      managerId: manager.id,
      isActive: true,
    },
  });

  // 一般営業担当者2
  const member2 = await prisma.salesPerson.upsert({
    where: { email: 'suzuki@example.com' },
    update: {},
    create: {
      employeeCode: 'EMP004',
      name: '鈴木 花子',
      email: 'suzuki@example.com',
      passwordHash: memberPassword,
      role: Role.member,
      managerId: manager.id,
      isActive: true,
    },
  });

  console.log('Created sales persons:', { admin, manager, member1, member2 });

  // 顧客のシードデータ
  const customer1 = await prisma.customer.upsert({
    where: { customerCode: 'C001' },
    update: {},
    create: {
      customerCode: 'C001',
      name: '株式会社ABC',
      address: '東京都港区芝公園1-1-1',
      phone: '03-1234-5678',
      isActive: true,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { customerCode: 'C002' },
    update: {},
    create: {
      customerCode: 'C002',
      name: 'DEF株式会社',
      address: '大阪府大阪市北区梅田2-2-2',
      phone: '06-9876-5432',
      isActive: true,
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { customerCode: 'C003' },
    update: {},
    create: {
      customerCode: 'C003',
      name: 'GHI工業',
      address: '神奈川県横浜市中区山下町3-3-3',
      phone: '045-111-2222',
      isActive: true,
    },
  });

  console.log('Created customers:', { customer1, customer2, customer3 });

  // 日報のシードデータ
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const report1 = await prisma.dailyReport.upsert({
    where: {
      salesPersonId_reportDate: {
        salesPersonId: member1.id,
        reportDate: yesterday,
      },
    },
    update: {},
    create: {
      salesPersonId: member1.id,
      reportDate: yesterday,
      problem: 'A社への提案価格について上長に相談したい。\n競合他社の動向が気になる。',
      plan: 'B社へ見積もり提出\nC社アポイント調整',
      status: ReportStatus.submitted,
    },
  });

  // 訪問記録のシードデータ
  const existingVisitRecords = await prisma.visitRecord.count({
    where: { dailyReportId: report1.id },
  });

  if (existingVisitRecords === 0) {
    await prisma.visitRecord.createMany({
      data: [
        {
          dailyReportId: report1.id,
          customerId: customer1.id,
          visitTime: '10:00',
          content: '新製品の提案を実施。次回見積もり提出予定。担当者は前向きに検討中。',
          sortOrder: 0,
        },
        {
          dailyReportId: report1.id,
          customerId: customer2.id,
          visitTime: '14:00',
          content: '定期訪問。現状のサービスに満足とのこと。追加提案の余地あり。',
          sortOrder: 1,
        },
        {
          dailyReportId: report1.id,
          customerId: customer3.id,
          visitTime: '16:30',
          content: '新規開拓。担当者不在のため名刺を置いてきた。後日再訪問予定。',
          sortOrder: 2,
        },
      ],
    });
  }

  // コメントのシードデータ
  const existingComments = await prisma.comment.count({
    where: { dailyReportId: report1.id },
  });

  if (existingComments === 0) {
    await prisma.comment.createMany({
      data: [
        {
          dailyReportId: report1.id,
          commenterId: manager.id,
          content: 'A社の件、明日のMTGで相談しましょう。',
        },
        {
          dailyReportId: report1.id,
          commenterId: manager.id,
          content: '競合情報はマーケ部にも共有してください。',
        },
      ],
    });
  }

  console.log('Created daily report with visit records and comments');

  console.log('Seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

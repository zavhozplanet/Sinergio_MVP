const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
    // 1. Update text in offers
    const offers = await db.offer.findMany();
    for (const o of offers) {
        if (o.title?.includes('продюсер') || o.title?.includes('диспут') || 
            o.description?.includes('продюсер') || o.description?.includes('диспут')) {
            await db.offer.update({
                where: { id: o.id },
                data: {
                    title: o.title?.replace(/продюсер/gi, 'виробник').replace(/диспут/gi, 'вирішення питань'),
                    description: o.description?.replace(/продюсер/gi, 'виробник').replace(/диспут/gi, 'вирішення питань')
                }
            });
        }
    }
    
    // 2. Give all existing PRODUCER users the boolean flag and some S-Index so icons show up!
    await db.user.updateMany({
        where: { role: 'PRODUCER', is_producer: false },
        data: { is_producer: true, is_consumer: true, c_index: 85 }
    });
    console.log("Test data updated.");
}
run().finally(() => db.$disconnect());

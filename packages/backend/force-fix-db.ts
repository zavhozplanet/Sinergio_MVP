import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function run() {
    console.log("Starting DB force update...");
    const offers = await db.offer.findMany();
    let updatedOffers = 0;

    for (const o of offers) {
        let newTitle = o.title;
        let newDesc = o.description;

        let changed = false;
        if (newTitle && newTitle.toLowerCase().includes('диспут')) { newTitle = newTitle.replace(/диспут/gi, 'Вирішення питань'); changed = true; }
        if (newTitle && newTitle.toLowerCase().includes('продюсер')) { newTitle = newTitle.replace(/продюсер/gi, 'Виробник'); changed = true; }

        if (newDesc && newDesc.toLowerCase().includes('диспут')) { newDesc = newDesc.replace(/диспут/gi, 'вирішення питань'); changed = true; }
        if (newDesc && newDesc.toLowerCase().includes('продюсер')) { newDesc = newDesc.replace(/продюсер/gi, 'виробник'); changed = true; }

        if (changed) {
            await db.offer.update({
                where: { id: o.id },
                data: { title: newTitle, description: newDesc }
            });
            updatedOffers++;
        }
    }

    // Update ALL users that are attached to any offers to be strictly visible as producers 
    const producerIds = [...new Set(offers.map(o => o.producer_id))];
    const updatedUsers = await db.user.updateMany({
        where: { id: { in: producerIds } },
        data: { is_producer: true, is_consumer: true, c_index: 85 }
    });

    console.log(`Updated ${updatedOffers} offers and ${updatedUsers.count} producers.`);
}
run().finally(() => db.$disconnect());

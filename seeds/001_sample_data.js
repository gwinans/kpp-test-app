'use strict';

const path = require('node:path');
const fs = require('node:fs');

function loadFixture(name) {
  const filePath = path.join(__dirname, '..', 'fixtures', name);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function createDeterministicRandom(seed = 1337) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

exports.seed = async function (knex) {
  const gadgetsFixture = loadFixture('gadgets.json');
  const warehousesFixture = loadFixture('warehouses.json');
  const customersFixture = loadFixture('customers.json');

  const random = createDeterministicRandom();

  await knex.transaction(async (trx) => {
    await trx('inventory_snapshots').del();
    await trx('order_items').del();
    await trx('orders').del();
    await trx('gadgets').del();
    await trx('customers').del();
    await trx('warehouses').del();

    const warehouseIds = {};
    for (const warehouse of warehousesFixture) {
      const [id] = await trx('warehouses').insert({
        code: warehouse.code,
        region: warehouse.region
      });
      warehouseIds[warehouse.code] = id;
    }

    const gadgetIds = {};
    for (const gadget of gadgetsFixture) {
      const [id] = await trx('gadgets').insert({
        title: gadget.title,
        status: gadget.status,
        qty: gadget.qty,
        price: gadget.price,
        warehouse_id: warehouseIds[gadget.warehouse] || null
      });
      gadgetIds[gadget.title] = id;
    }

    const customerIds = {};
    for (const customer of customersFixture) {
      const [id] = await trx('customers').insert({
        external_id: customer.external_id,
        email: customer.email,
        full_name: customer.full_name,
        status: customer.status
      });
      customerIds[customer.external_id] = id;
    }

    const ordersToInsert = [];
    const orderItemsToInsert = [];
    let orderCounter = 1;

    const gadgetTitles = Object.keys(gadgetIds);

    for (const customer of customersFixture) {
      const orderCount = 20 + Math.floor(random() * 15);
      for (let i = 0; i < orderCount; i++) {
        const orderNumber = `ORD-${String(orderCounter).padStart(5, '0')}`;
        const statusRoll = random();
        const status = statusRoll > 0.85 ? 'cancelled' : statusRoll > 0.6 ? 'processing' : statusRoll > 0.2 ? 'fulfilled' : 'pending';
        const totalItems = 1 + Math.floor(random() * 4);
        const items = [];
        let totalCents = 0;
        for (let j = 0; j < totalItems; j++) {
          const gadgetTitle = gadgetTitles[Math.floor(random() * gadgetTitles.length)];
          const quantity = 1 + Math.floor(random() * 3);
          const priceCents = Math.floor(random() * 90000) + 1000;
          items.push({ gadgetTitle, quantity, priceCents });
          totalCents += priceCents * quantity;
        }
        ordersToInsert.push({
          order_number: orderNumber,
          customer_id: customerIds[customer.external_id],
          total_cents: totalCents,
          status
        });
        orderItemsToInsert.push({ orderNumber, items });
        orderCounter++;
      }
    }

    const orderIds = [];
    for (const order of ordersToInsert) {
      const [id] = await trx('orders').insert(order);
      orderIds.push(id);
    }

    for (let i = 0; i < orderItemsToInsert.length; i++) {
      const { items } = orderItemsToInsert[i];
      const orderId = orderIds[i];
      for (const item of items) {
        await trx('order_items').insert({
          order_id: orderId,
          gadget_id: gadgetIds[item.gadgetTitle],
          quantity: item.quantity,
          price_cents: item.priceCents
        });
      }
    }

    const snapshotDays = 30;
    for (const gadgetTitle of gadgetTitles) {
      const gadgetId = gadgetIds[gadgetTitle];
      for (const warehouse of warehousesFixture) {
        const warehouseId = warehouseIds[warehouse.code];
        for (let dayOffset = 0; dayOffset < snapshotDays; dayOffset++) {
          const quantity = Math.floor(200 + random() * 500);
          const snapshotDate = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          await trx('inventory_snapshots').insert({
            gadget_id: gadgetId,
            warehouse_id: warehouseId,
            snapshot_date: snapshotDate,
            quantity
          });
        }
      }
    }
  });
};

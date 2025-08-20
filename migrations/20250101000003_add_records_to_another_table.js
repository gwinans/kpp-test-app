exports.up = async function(knex) {
  // Example 1: Inserting a single record
  await knex('test_table').insert({
    name: 'Item 0',
    value: '100'
  });

  // Example 2: Inserting multiple records
  await knex('test_table').insert([
    { name: 'Item A', value: '101' },
    { name: 'Item B', value: '102' }
  ]);
};

exports.down = async function(knex) {
  // Example 1: Deleting the single record
  await knex('test_table').where({
    name: 'Item 0',
    value: '100'
  }).del();

  // Example 2: Deleting the multiple records
  await knex('test_table').whereIn('name', ['Item A', 'Item B']).andWhereIn('value', ['101', '102']).del();
}
import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://acyum:SQ87wyXxmxBPKeuB@users.ie7ie.mongodb.net/?retryWrites=true&w=majority&appName=Users';
const dbName = 'acyum';

async function createDatabase() {
  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');

    // Create the database by creating a collection
    const db = client.db(dbName);
    await db.createCollection('init'); // Create an initial collection to ensure the database is created
    console.log(`Database '${dbName}' created successfully`);

    // Create indexes for existing collections if needed
    // Example: await db.collection('users').createIndex({ address: 1 }, { unique: true });

  } catch (error) {
    console.error('Error creating database:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

createDatabase().catch(console.error); 
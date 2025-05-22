import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://acyum:SQ87wyXxmxBPKeuB@users.ie7ie.mongodb.net/?retryWrites=true&w=majority&appName=Users';
const dbName = 'acyum';

async function verifyDatabase() {
  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');

    // Get the database
    const db = client.db(dbName);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in the database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    // Get database stats
    const stats = await db.stats();
    console.log('\nDatabase stats:');
    console.log(`Collections: ${stats.collections}`);
    console.log(`Objects: ${stats.objects}`);
    console.log(`Data size: ${stats.dataSize} bytes`);
    console.log(`Storage size: ${stats.storageSize} bytes`);

  } catch (error) {
    console.error('Error verifying database:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

verifyDatabase().catch(console.error); 
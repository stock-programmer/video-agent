import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-maker';

async function fixImageUrls() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('workspaces');

    // Find all workspaces with full URL image_url
    const workspaces = await collection.find({
      image_url: { $regex: '^http://localhost:3000/uploads/' }
    }).toArray();

    console.log(`Found ${workspaces.length} workspaces to update`);

    // Update each workspace
    for (const workspace of workspaces) {
      const oldUrl = workspace.image_url;
      // Extract filename from URL
      const newUrl = oldUrl.replace('http://localhost:3000', '');

      await collection.updateOne(
        { _id: workspace._id },
        { $set: { image_url: newUrl } }
      );

      console.log(`Updated: ${oldUrl} -> ${newUrl}`);
    }

    console.log('All image URLs updated successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixImageUrls();

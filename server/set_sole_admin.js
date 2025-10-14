const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function setSoleAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/buzzsmile');
        console.log('Connected to MongoDB');

        const targetEmail = 'npkalyx@gmail.com';
        
        // First, demote all current admin users to regular users
        const demoteResult = await User.updateMany(
            { role: 'admin' },
            { 
                $set: { 
                    role: 'user',
                    plan: 'free'
                }
            }
        );
        console.log(`Demoted ${demoteResult.modifiedCount} admin users to regular users`);

        // Find and update the target user to admin
        const targetUser = await User.findOneAndUpdate(
            { email: targetEmail },
            { 
                $set: { 
                    role: 'admin',
                    plan: 'god'
                }
            },
            { new: true }
        );

        if (targetUser) {
            console.log(`Successfully set ${targetEmail} as admin with god plan`);
            console.log('User details:', {
                name: targetUser.name,
                email: targetUser.email,
                role: targetUser.role,
                plan: targetUser.plan
            });
        } else {
            console.log(`User with email ${targetEmail} not found`);
            
            // Create the user if they don't exist
            const newAdmin = new User({
                name: 'Admin User',
                email: targetEmail,
                password: '$2b$10$defaulthashedpassword', // You should set a proper password
                role: 'admin',
                plan: 'god',
                credits: 999999
            });
            
            await newAdmin.save();
            console.log(`Created new admin user: ${targetEmail}`);
        }

        // Verify the changes by listing all users
        const allUsers = await User.find({}, 'name email role plan');
        console.log('\nAll users after update:');
        allUsers.forEach(user => {
            console.log(`- ${user.name} (${user.email}): ${user.role} - ${user.plan} plan`);
        });

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

setSoleAdmin();
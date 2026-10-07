/**
 * seed.js
 *
 * Populates the database with realistic demo data for manual testing.
 * Run with:
 *   node seed.js          — inserts demo data (skips if already present)
 *   node seed.js --clear  — wipes all collections first, then inserts fresh
 *
 * Demo accounts (all share the password "Password123"):
 *   admin@goodgrid.com    — admin role
 *   mod@goodgrid.com      — moderator role
 *   alice@goodgrid.com    — regular user (has requests + applications)
 *   bob@goodgrid.com      — regular user (volunteer)
 *   carol@goodgrid.com    — regular user (volunteer)
 *   dave@goodgrid.com     — regular user
 *
 * Use these accounts to manually test every user flow described in the spec.
 *
 * NO real secrets or private data appear here — all values are clearly fake.
 */
require('./src/config/env'); // validate env vars before anything else
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { MONGODB_URI } = require('./src/config/env');
const User = require('./src/models/User');
const Request = require('./src/models/Request');
const VolunteerApplication = require('./src/models/VolunteerApplication');
const {
  ROLES,
  REQUEST_STATUS,
  URGENCY_LEVELS,
  BCRYPT_SALT_ROUNDS,
} = require('./src/utils/constants');

const DEMO_PASSWORD = 'Password123';

const DEMO_USERS = [
  {
    name: 'Admin User',
    email: 'admin@goodgrid.com',
    role: ROLES.ADMIN,
    bio: 'Platform administrator.',
    isEmailVerified: true,
    location: { type: 'Point', coordinates: [77.5946, 12.9716], address: 'Bangalore, India' },
  },
  {
    name: 'Moderator Mo',
    email: 'mod@goodgrid.com',
    role: ROLES.MODERATOR,
    bio: 'Content moderator.',
    isEmailVerified: true,
    location: { type: 'Point', coordinates: [77.6101, 12.9352], address: 'Koramangala, Bangalore' },
  },
  {
    name: 'Alice Sharma',
    email: 'alice@goodgrid.com',
    role: ROLES.USER,
    bio: 'Software engineer who loves community service.',
    skills: ['coding', 'teaching', 'tutoring'],
    isEmailVerified: true,
    location: { type: 'Point', coordinates: [77.5800, 12.9600], address: 'Indiranagar, Bangalore' },
  },
  {
    name: 'Bob Kumar',
    email: 'bob@goodgrid.com',
    role: ROLES.USER,
    bio: 'Retired teacher, happy to help neighbours.',
    skills: ['teaching', 'driving', 'cooking'],
    isEmailVerified: true,
    location: { type: 'Point', coordinates: [77.6200, 12.9800], address: 'Whitefield, Bangalore' },
  },
  {
    name: 'Carol Nair',
    email: 'carol@goodgrid.com',
    role: ROLES.USER,
    bio: 'Medical professional, volunteer on weekends.',
    skills: ['medical', 'first-aid'],
    isEmailVerified: true,
    location: { type: 'Point', coordinates: [77.5500, 12.9300], address: 'JP Nagar, Bangalore' },
  },
  {
    name: 'Dave Patel',
    email: 'dave@goodgrid.com',
    role: ROLES.USER,
    bio: 'Handyman and weekend volunteer.',
    skills: ['repair', 'plumbing', 'carpentry'],
    isEmailVerified: true,
    location: { type: 'Point', coordinates: [77.6300, 13.0200], address: 'Hebbal, Bangalore' },
  },
];

const buildRequests = (users) => {
  const [, , alice, bob, carol, dave] = users;
  return [
    {
      title: 'Need help with Python assignment',
      description: 'I am struggling with data structures in Python. Looking for someone to help me understand linked lists and trees for my college assignment due next week.',
      category: 'tutoring',
      urgency: URGENCY_LEVELS.HIGH,
      status: REQUEST_STATUS.OPEN,
      owner: alice._id,
      location: alice.location,
    },
    {
      title: 'Leaky faucet repair in kitchen',
      description: 'My kitchen faucet has been leaking for 3 days. Water is dripping constantly. I have the replacement parts but need someone with plumbing experience to help fix it.',
      category: 'repair',
      urgency: URGENCY_LEVELS.MEDIUM,
      status: REQUEST_STATUS.OPEN,
      owner: alice._id,
      location: alice.location,
    },
    {
      title: 'Help moving furniture to new flat',
      description: 'Moving from a 2BHK to a 3BHK next Saturday. Need 2–3 people to help carry furniture. I will arrange the truck, just need helping hands. Will provide food and drinks.',
      category: 'moving',
      urgency: URGENCY_LEVELS.LOW,
      status: REQUEST_STATUS.OPEN,
      owner: bob._id,
      location: bob.location,
    },
    {
      title: 'Elderly neighbour needs grocery delivery',
      description: 'My elderly neighbour (75 years old) needs someone to pick up groceries from the nearby store once a week. She has mobility issues and lives alone.',
      category: 'volunteers',
      urgency: URGENCY_LEVELS.MEDIUM,
      status: REQUEST_STATUS.IN_PROGRESS,
      owner: carol._id,
      acceptedVolunteer: dave._id,
      location: carol.location,
    },
    {
      title: 'Dog walking — golden retriever, twice a day',
      description: 'I travel for work next week (Mon–Fri) and need someone to walk my golden retriever twice a day, morning and evening. He is friendly and well trained.',
      category: 'pet_care',
      urgency: URGENCY_LEVELS.HIGH,
      status: REQUEST_STATUS.OPEN,
      owner: dave._id,
      location: dave.location,
    },
    {
      title: 'Laptop not turning on — need tech help',
      description: 'My laptop suddenly stopped turning on. It charges but the screen stays black. I think it might be a RAM issue. Would appreciate someone who knows hardware troubleshooting.',
      category: 'technology',
      urgency: URGENCY_LEVELS.MEDIUM,
      status: REQUEST_STATUS.OPEN,
      owner: bob._id,
      location: bob.location,
    },
    {
      title: 'Looking for a home-cooked meal (post-surgery)',
      description: 'I recently had minor surgery and have dietary restrictions. Looking for someone who can cook and deliver a simple healthy meal (no spicy food, low-sodium) for about 5 days.',
      category: 'cooking',
      urgency: URGENCY_LEVELS.HIGH,
      status: REQUEST_STATUS.COMPLETED,
      owner: carol._id,
      location: carol.location,
    },
    {
      title: 'Garden cleanup — overgrown backyard',
      description: 'My backyard has become overgrown after the monsoon. Looking for someone to help trim bushes and clear weeds for a few hours on a weekend. Tools available.',
      category: 'gardening',
      urgency: URGENCY_LEVELS.LOW,
      status: REQUEST_STATUS.CLOSED,
      owner: alice._id,
      location: alice.location,
    },
  ];
};

const buildApplications = (requests, users) => {
  const [, , alice, bob, carol, dave] = users;

  // Applications for alice's python tutoring request (index 0)
  return [
    { request: requests[0]._id, volunteer: bob._id, message: 'I am a retired teacher with 20 years of experience. Happy to help with Python!', status: 'pending' },
    { request: requests[0]._id, volunteer: carol._id, message: 'I have a CS degree and can explain data structures clearly.', status: 'pending' },

    // Application for bob's moving request (index 2)
    { request: requests[2]._id, volunteer: dave._id, message: 'Happy to help with the move! I am free Saturday.', status: 'pending' },

    // Application for carol's grocery delivery request (index 3) — already accepted
    { request: requests[3]._id, volunteer: dave._id, message: 'I pass by that area every day. Happy to pick up groceries.', status: 'accepted' },

    // Application for dave's dog-walking request (index 4)
    { request: requests[4]._id, volunteer: alice._id, message: 'I love dogs and work from home, so timing is flexible.', status: 'pending' },
  ];
};

const seed = async () => {
  const shouldClear = process.argv.includes('--clear');

  // Same TLS options as db.js — required on Windows to avoid "SSL alert 80" from Atlas
  await mongoose.connect(MONGODB_URI, { tls: true, tlsAllowInvalidCertificates: false });
  console.log('[Seed] Connected to MongoDB');

  if (shouldClear) {
    await Promise.all([
      User.deleteMany({}),
      Request.deleteMany({}),
      VolunteerApplication.deleteMany({}),
    ]);
    console.log('[Seed] Cleared all collections');
  }

  // Hash the shared demo password once (same for all accounts)
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);

  // Insert users
  const users = await User.insertMany(
    DEMO_USERS.map((u) => ({ ...u, password: hashedPassword }))
  );
  console.log(`[Seed] Inserted ${users.length} users`);

  // Insert requests
  const requestData = buildRequests(users);
  const requests = await Request.insertMany(requestData);
  console.log(`[Seed] Inserted ${requests.length} requests`);

  // Update requestsCount on user documents
  const requestCountMap = {};
  requestData.forEach((r) => {
    const key = r.owner.toString();
    requestCountMap[key] = (requestCountMap[key] || 0) + 1;
  });
  await Promise.all(
    Object.entries(requestCountMap).map(([userId, count]) =>
      User.findByIdAndUpdate(userId, { requestsCount: count })
    )
  );

  // Insert volunteer applications
  const applicationData = buildApplications(requests, users);
  const applications = await VolunteerApplication.insertMany(applicationData);
  console.log(`[Seed] Inserted ${applications.length} volunteer applications`);

  console.log('\n✅ Seed complete! Demo accounts (password: Password123):');
  console.log('   admin@goodgrid.com   — admin');
  console.log('   mod@goodgrid.com     — moderator');
  console.log('   alice@goodgrid.com   — user');
  console.log('   bob@goodgrid.com     — user');
  console.log('   carol@goodgrid.com   — user');
  console.log('   dave@goodgrid.com    — user\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('[Seed] Error:', err.message);
  mongoose.disconnect();
  process.exit(1);
});

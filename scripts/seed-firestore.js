const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, setDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyAeStEnpwY3AKb2jcsZJ9Sweyqtqb9eeWc",
  authDomain: "cigara-fe6d1.firebaseapp.com",
  projectId: "cigara-fe6d1",
  storageBucket: "cigara-fe6d1.firebasestorage.app",
  messagingSenderId: "628202113263",
  appId: "1:628202113263:web:4e9af2c3df89bb6dfab31a",
  measurementId: "G-BENBG0MTLM",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedCategories = [
  { id: "cat-books", name: "Books & study materials", slug: "books", sort_order: 1 },
  { id: "cat-electronics", name: "Electronics & Gadgets", slug: "electronics", sort_order: 2 },
  { id: "cat-stationery", name: "Stationery & Drafters", slug: "stationery", sort_order: 3 },
  { id: "cat-hostel", name: "Hostel Essentials", slug: "hostel", sort_order: 4 },
  { id: "cat-cycles", name: "Cycles & Sports", slug: "cycles", sort_order: 5 },
  { id: "cat-finds", name: "Other Campus Finds", slug: "campus-finds", sort_order: 6 },
];

const seedProducts = [
  {
    id: "item-casio-calc",
    name: "Casio FX-991ES Plus Scientific Calculator",
    description: "Perfect condition scientific calculator used for 1 semester. Includes slide-on hard case. Ideal for engineering mathematics & mechanics exams.",
    price: 650,
    item_condition: "like_new",
    quantity: 1,
    category_id: "cat-electronics",
    categoryName: "Electronics & Gadgets",
    seller_id: "seller-nitc-001",
    sellerName: "Aravind (BTech EEE)",
    sellerHandle: "aravind_eee",
    sellerPhone: "9847123456",
    college_id: "nit-calicut",
    status: "approved",
    is_featured: true,
    imageUrl: null,
    published_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "item-eng-books",
    name: "Higher Engineering Mathematics by B.S. Grewal (44th Ed)",
    description: "Essential textbook for 1st & 2nd year engineering students. No torn pages, clear pencil notes in margin. Ready for next semester.",
    price: 380,
    item_condition: "good",
    quantity: 1,
    category_id: "cat-books",
    categoryName: "Books & study materials",
    seller_id: "seller-nitc-002",
    sellerName: "Sneha M (BTech CSE)",
    sellerHandle: "sneha_cse",
    sellerPhone: "9446987654",
    college_id: "nit-calicut",
    status: "approved",
    is_featured: false,
    imageUrl: null,
    published_at: new Date(Date.now() - 7200000).toISOString(),
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "item-drafter-kit",
    name: "Omega Engineering Mini Drafter with Canvas Cover",
    description: "Standard NITC mechanical & civil engineering drawing mini-drafter. Accurate scales with smooth steel clamp. Canvas carry bag included.",
    price: 250,
    item_condition: "good",
    quantity: 1,
    category_id: "cat-stationery",
    categoryName: "Stationery & Drafters",
    seller_id: "seller-nitc-003",
    sellerName: "Rahul K (BTech ME)",
    sellerHandle: "rahul_mech",
    sellerPhone: "9745123890",
    college_id: "nit-calicut",
    status: "approved",
    is_featured: false,
    imageUrl: null,
    published_at: new Date(Date.now() - 10800000).toISOString(),
    created_at: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "item-desk-lamp",
    name: "Rechargeable LED Desk Study Lamp with 3 Brightness Modes",
    description: "Warm and cool white eye-protection lamp. USB rechargeable battery lasts up to 6 hours during hostel power cuts. Flexible 360° gooseneck.",
    price: 320,
    item_condition: "like_new",
    quantity: 1,
    category_id: "cat-hostel",
    categoryName: "Hostel Essentials",
    seller_id: "seller-nitc-001",
    sellerName: "Aravind (BTech EEE)",
    sellerHandle: "aravind_eee",
    sellerPhone: "9847123456",
    college_id: "nit-calicut",
    status: "approved",
    is_featured: false,
    imageUrl: null,
    published_at: new Date(Date.now() - 14400000).toISOString(),
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "item-lab-coat",
    name: "Chemistry Lab Coat (Size 38 / M) - Senior Donation",
    description: "[GIVEAWAY] Clean 100% cotton white lab coat for 1st year chemistry lab. Free senior handover at Mega Mess or Central Library.",
    price: 0,
    item_condition: "good",
    quantity: 1,
    category_id: "cat-finds",
    categoryName: "Other Campus Finds",
    seller_id: "seller-nitc-004",
    sellerName: "Deepak (BTech Chem)",
    sellerHandle: "deepak_che",
    sellerPhone: "9895671234",
    college_id: "nit-calicut",
    status: "approved",
    is_featured: false,
    imageUrl: null,
    published_at: new Date(Date.now() - 18000000).toISOString(),
    created_at: new Date(Date.now() - 18000000).toISOString(),
  },
];

async function seed() {
  console.log("Seeding Google Firestore for project cigara-fe6d1...");

  // Seed categories
  for (const cat of seedCategories) {
    await setDoc(doc(db, "categories", cat.id), cat);
    console.log(`✓ Added category: ${cat.name}`);
  }

  // Seed products
  for (const prod of seedProducts) {
    await setDoc(doc(db, "products", prod.id), prod);
    console.log(`✓ Added product: ${prod.name}`);
  }

  console.log("\n🎉 Successfully seeded Google Firestore database!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding error:", err.message);
  process.exit(1);
});

export type ServiceSeedItem = {
  slug: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  rating: number;
  reviews: number;
  image: string;
  process: string[];
  deliveryTime: string;
  jobType: "PLUMBING" | "ELECTRICAL" | "PAINTING" | "CARPENTRY" | "CLEANING" | "AC_REPAIR" | "APPLIANCE_REPAIR" | "OTHER";
};

export type ServiceCategorySeed = {
  slug: string;
  name: string;
  iconKey: string;
  color: string;
  bg: string;
  sortOrder: number;
  services: ServiceSeedItem[];
};

export const SERVICE_CATALOG_SEED: ServiceCategorySeed[] = [
  {
    slug: "labour",
    name: "Labour",
    iconKey: "HardHat",
    color: "#F97316",
    bg: "#FFF7ED",
    sortOrder: 1,
    services: [
      { slug: "masonry-helper", name: "Masonry Helper", description: "Mixing cement, carrying bricks, general masonry assistance", price: 399, duration: "Per day", rating: 4.5, reviews: 210, image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80", process: ["Arrive on site", "Assist with cement mixing", "Carry materials as directed", "Site cleanup"], deliveryTime: "30 MINS", jobType: "OTHER" },
      { slug: "loading-unloading", name: "Loading / Unloading", description: "Warehouse shifting, house moving, heavy item loading", price: 499, duration: "4 hrs", rating: 4.6, reviews: 340, image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80", process: ["Assess items", "Careful packing", "Loading/unloading", "Placement at destination"], deliveryTime: "40 MINS", jobType: "OTHER" },
      { slug: "painting-helper", name: "Painting Helper", description: "Scraping, sanding, masking surfaces before painting", price: 349, duration: "Per day", rating: 4.4, reviews: 180, image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&q=80", process: ["Surface preparation", "Scraping old paint", "Sanding & masking", "Clean-up after work"], deliveryTime: "30 MINS", jobType: "PAINTING" },
      { slug: "cleaning-helper", name: "Cleaning Helper", description: "Post-construction cleanup, heavy lifting, debris removal", price: 449, duration: "Per day", rating: 4.5, reviews: 290, image: "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&q=80", process: ["Debris collection", "Heavy item shifting", "Mopping & dusting", "Waste disposal"], deliveryTime: "30 MINS", jobType: "CLEANING" },
      { slug: "gardening", name: "Gardening", description: "Digging, planting, lawn mowing and garden maintenance", price: 299, duration: "3 hrs", rating: 4.7, reviews: 420, image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80", process: ["Lawn assessment", "Mowing & trimming", "Planting/digging", "Watering & cleanup"], deliveryTime: "35 MINS", jobType: "OTHER" },
      { slug: "packing-moving", name: "Packing / Moving", description: "House shifting, box packing, safe item transport", price: 599, duration: "Half day", rating: 4.6, reviews: 380, image: "https://images.unsplash.com/photo-1530435460869-d13625c69bbf?w=600&q=80", process: ["Inventory listing", "Safe packing", "Loading vehicle", "Unpacking at new location"], deliveryTime: "45 MINS", jobType: "OTHER" },
      { slug: "other-labour", name: "Other Labour", description: "Any other general labour work not listed above", price: 399, duration: "Flexible", rating: 4.4, reviews: 150, image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80", process: ["Discuss requirements", "Agree on scope", "Complete the work", "Review & payment"], deliveryTime: "35 MINS", jobType: "OTHER" }
    ]
  },
  {
    slug: "plumbing",
    name: "Plumbing",
    iconKey: "Wrench",
    color: "#3B82F6",
    bg: "#EFF6FF",
    sortOrder: 2,
    services: [
      { slug: "leak-repair", name: "Leak Repair", description: "Taps, pipes, tanks — fast leak detection & fixing", price: 199, duration: "1 hr", rating: 4.7, reviews: 520, image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80", process: ["Locate the leak", "Assess damage", "Repair/replace parts", "Test & verify fix"], deliveryTime: "20 MINS", jobType: "PLUMBING" },
      { slug: "toilet-bathroom-fitting", name: "Toilet / Bathroom Fitting", description: "Commode, shower, geyser installation and fitting", price: 699, duration: "2 hrs", rating: 4.8, reviews: 310, image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80", process: ["Site inspection", "Disconnect old fixtures", "Install new fittings", "Test for leaks"], deliveryTime: "35 MINS", jobType: "PLUMBING" },
      { slug: "drain-cleaning", name: "Drain Cleaning", description: "Clogged sinks, sewage lines, blocked drains", price: 249, duration: "1 hr", rating: 4.6, reviews: 440, image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=600&q=80", process: ["Identify blockage point", "Use drain snake/hydro jet", "Clear blockage", "Test water flow"], deliveryTime: "25 MINS", jobType: "PLUMBING" },
      { slug: "motor-pump-repair", name: "Motor / Pump Repair", description: "Borewell, tank filling motors, pump servicing", price: 499, duration: "1.5 hrs", rating: 4.7, reviews: 280, image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80", process: ["Diagnose motor issue", "Check wiring", "Repair/replace parts", "Test operation"], deliveryTime: "35 MINS", jobType: "PLUMBING" },
      { slug: "pipe-fitting", name: "Pipe Fitting", description: "New connections, PVC/CPVC pipe work and installation", price: 349, duration: "2 hrs", rating: 4.6, reviews: 360, image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80", process: ["Plan pipe route", "Cut & fit pipes", "Joint sealing", "Pressure test"], deliveryTime: "30 MINS", jobType: "PLUMBING" },
      { slug: "water-tank-cleaning-plumbing", name: "Water Tank Cleaning", description: "Overhead and underground tank disinfection & scrubbing", price: 599, duration: "2 hrs", rating: 4.8, reviews: 410, image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80", process: ["Drain existing water", "Scrub interior walls", "Disinfect with solution", "Refill & verify clean"], deliveryTime: "40 MINS", jobType: "PLUMBING" },
      { slug: "kitchen-plumbing", name: "Kitchen Plumbing", description: "Sink, dishwasher connection, RO installation", price: 399, duration: "1.5 hrs", rating: 4.7, reviews: 290, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80", process: ["Assess kitchen layout", "Install inlet/outlet", "Connect appliances", "Check for leaks"], deliveryTime: "30 MINS", jobType: "PLUMBING" },
      { slug: "other-plumbing", name: "Other Plumbing", description: "Any other plumbing work not listed above", price: 299, duration: "Flexible", rating: 4.5, reviews: 160, image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80", process: ["Discuss requirements", "Assess on site", "Complete work", "Review & payment"], deliveryTime: "25 MINS", jobType: "PLUMBING" }
    ]
  },
  {
    slug: "cleaning",
    name: "Cleaning",
    iconKey: "Sparkles",
    color: "#06B6D4",
    bg: "#ECFEFF",
    sortOrder: 3,
    services: [
      { slug: "home-deep-cleaning", name: "Home Deep Cleaning", description: "Full house cleaning, move-in/move-out deep clean", price: 299, duration: "3 hrs", rating: 4.9, reviews: 680, image: "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&q=80", process: ["Room-by-room plan", "Dust & vacuum", "Mop all floors", "Sanitize surfaces"], deliveryTime: "30 MINS", jobType: "CLEANING" },
      { slug: "bathroom-cleaning", name: "Bathroom Cleaning", description: "Tiles, grout scrubbing, acid wash, full sanitization", price: 149, duration: "1 hr", rating: 4.7, reviews: 340, image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80", process: ["Apply cleaning agents", "Scrub tiles & grout", "Clean fixtures", "Disinfect & dry"], deliveryTime: "20 MINS", jobType: "CLEANING" },
      { slug: "kitchen-cleaning", name: "Kitchen Cleaning", description: "Chimney, exhaust, grease removal, cabinet cleaning", price: 199, duration: "2 hrs", rating: 4.8, reviews: 290, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80", process: ["Degrease chimney", "Clean countertops", "Scrub sink & taps", "Wipe cabinets inside/out"], deliveryTime: "25 MINS", jobType: "CLEANING" },
      { slug: "water-tank-cleaning", name: "Water Tank Cleaning", description: "Full disinfection, scrubbing, sanitization of tanks", price: 599, duration: "2 hrs", rating: 4.8, reviews: 410, image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80", process: ["Drain tank", "Scrub walls", "Disinfect", "Refill & check"], deliveryTime: "40 MINS", jobType: "CLEANING" },
      { slug: "office-commercial-cleaning", name: "Office / Commercial Cleaning", description: "Shops, small offices, commercial spaces deep clean", price: 799, duration: "4 hrs", rating: 4.6, reviews: 210, image: "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&q=80", process: ["Area assessment", "Dust & vacuum all areas", "Sanitize workstations", "Clean washrooms"], deliveryTime: "45 MINS", jobType: "CLEANING" },
      { slug: "post-construction-cleaning", name: "Post-Construction Cleaning", description: "Debris removal, dust cleaning, final finishing", price: 999, duration: "5 hrs", rating: 4.7, reviews: 180, image: "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&q=80", process: ["Remove construction debris", "Dust all surfaces", "Clean windows & floors", "Final polish"], deliveryTime: "50 MINS", jobType: "CLEANING" },
      { slug: "dishes-cleaning", name: "Dishes Cleaning", description: "Professional dishwashing service for home or events", price: 199, duration: "1.5 hrs", rating: 4.5, reviews: 220, image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80", process: ["Sort dishes", "Wash with detergent", "Rinse & dry", "Stack & arrange"], deliveryTime: "20 MINS", jobType: "CLEANING" },
      { slug: "other-cleaning", name: "Other Cleaning", description: "Any other cleaning work not listed above", price: 249, duration: "Flexible", rating: 4.5, reviews: 140, image: "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&q=80", process: ["Discuss requirements", "Plan cleaning", "Execute work", "Review & payment"], deliveryTime: "20 MINS", jobType: "CLEANING" }
    ]
  },
  {
    slug: "repairing",
    name: "Repairing",
    iconKey: "Settings",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    sortOrder: 4,
    services: [
      { slug: "furniture-repair", name: "Furniture Repair", description: "Wooden chair, table, wobbling furniture, hinge fixing", price: 299, duration: "1.5 hrs", rating: 4.6, reviews: 310, image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80", process: ["Inspect damage", "Tighten joints & screws", "Replace hinges if needed", "Polish & finish"], deliveryTime: "25 MINS", jobType: "CARPENTRY" },
      { slug: "door-window-repair", name: "Door / Window Repair", description: "Hinges, handles, sliding channels, lock fitting", price: 249, duration: "1 hr", rating: 4.7, reviews: 280, image: "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=600&q=80", process: ["Check door/window alignment", "Tighten or replace hinges", "Fix handles & locks", "Test smooth operation"], deliveryTime: "20 MINS", jobType: "CARPENTRY" },
      { slug: "locksmith", name: "Locksmith", description: "Lock change, key making, digital lock installation", price: 349, duration: "1 hr", rating: 4.8, reviews: 390, image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80", process: ["Assess lock type", "Remove old lock", "Install new lock", "Test & hand over keys"], deliveryTime: "25 MINS", jobType: "OTHER" },
      { slug: "washing-machine-repair", name: "Washing Machine Repair", description: "Basic troubleshooting, installation, drum issues", price: 299, duration: "1.5 hrs", rating: 4.8, reviews: 510, image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80", process: ["Diagnose fault", "Check motor & drum", "Replace faulty parts", "Test wash cycle"], deliveryTime: "30 MINS", jobType: "APPLIANCE_REPAIR" },
      { slug: "fridge-repair", name: "Fridge Repair", description: "Gas refill, compressor issues, cooling problems", price: 399, duration: "2 hrs", rating: 4.7, reviews: 380, image: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&q=80", process: ["Check cooling level", "Inspect compressor", "Gas refill if needed", "Test temperature"], deliveryTime: "30 MINS", jobType: "APPLIANCE_REPAIR" },
      { slug: "microwave-oven-repair", name: "Microwave / Oven Repair", description: "Heating issues, element replacement, door repair", price: 249, duration: "1 hr", rating: 4.6, reviews: 240, image: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&q=80", process: ["Test microwave/oven", "Identify faulty component", "Replace element/part", "Test heating"], deliveryTime: "25 MINS", jobType: "APPLIANCE_REPAIR" },
      { slug: "ac-repair", name: "AC Repair", description: "Installation assist, cleaning, gas refill, servicing", price: 499, duration: "2 hrs", rating: 4.9, reviews: 620, image: "https://images.unsplash.com/photo-1631744007979-3aa9e7b48c81?w=600&q=80", process: ["Check cooling & gas", "Clean filters & coils", "Refill gas if needed", "Test cooling output"], deliveryTime: "35 MINS", jobType: "AC_REPAIR" },
      { slug: "ro-water-purifier", name: "RO / Water Purifier", description: "Filter change, membrane replacement, servicing", price: 349, duration: "1 hr", rating: 4.7, reviews: 290, image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80", process: ["Check TDS & flow", "Replace filters", "Change membrane", "Test water quality"], deliveryTime: "25 MINS", jobType: "APPLIANCE_REPAIR" },
      { slug: "other-repair", name: "Other Repair", description: "Any other repair work not listed above", price: 299, duration: "Flexible", rating: 4.5, reviews: 170, image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80", process: ["Discuss issue", "Diagnose on site", "Repair work", "Test & handover"], deliveryTime: "25 MINS", jobType: "OTHER" }
    ]
  },
  {
    slug: "electrician",
    name: "Electrician",
    iconKey: "Zap",
    color: "#F59E0B",
    bg: "#FFFBEB",
    sortOrder: 5,
    services: [
      { slug: "wiring-rewiring", name: "Wiring / Rewiring", description: "New points, concealed wiring, rewiring old systems", price: 299, duration: "2 hrs", rating: 4.8, reviews: 320, image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80", process: ["Plan wiring route", "Lay conduit/cables", "Connect to DB board", "Test all points"], deliveryTime: "30 MINS", jobType: "ELECTRICAL" },
      { slug: "fan-light-installation", name: "Fan / Light Installation", description: "Ceiling fan, LED panels, tube lights installation", price: 199, duration: "1 hr", rating: 4.7, reviews: 410, image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=600&q=80", process: ["Mark installation point", "Fix bracket/hook", "Connect wiring", "Test operation"], deliveryTime: "20 MINS", jobType: "ELECTRICAL" },
      { slug: "switch-socket-repair", name: "Switch / Socket Repair", description: "Board replacement, MCB fitting, socket repair", price: 149, duration: "30 mins", rating: 4.6, reviews: 480, image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80", process: ["Isolate power", "Remove old switch/socket", "Install new unit", "Test & restore power"], deliveryTime: "15 MINS", jobType: "ELECTRICAL" },
      { slug: "inverter-ups-installation", name: "Inverter / UPS Installation", description: "Battery connection, wiring, UPS setup", price: 399, duration: "1.5 hrs", rating: 4.7, reviews: 260, image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80", process: ["Select install location", "Connect batteries", "Wire to DB board", "Test switchover"], deliveryTime: "30 MINS", jobType: "ELECTRICAL" },
      { slug: "geyser-heater-repair", name: "Geyser / Heater Repair", description: "Element replacement, thermostat fixing, installation", price: 349, duration: "1 hr", rating: 4.8, reviews: 340, image: "https://images.unsplash.com/photo-1631744007979-3aa9e7b48c81?w=600&q=80", process: ["Test heating element", "Check thermostat", "Replace faulty parts", "Test hot water output"], deliveryTime: "25 MINS", jobType: "ELECTRICAL" },
      { slug: "home-automation", name: "Home Automation", description: "Smart switches, WiFi controls, basic automation setup", price: 699, duration: "2 hrs", rating: 4.6, reviews: 190, image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=600&q=80", process: ["Plan automation layout", "Install smart switches", "Configure WiFi/app", "Demo & handover"], deliveryTime: "40 MINS", jobType: "ELECTRICAL" },
      { slug: "ac-electrical", name: "AC Electrical", description: "Stabilizer install, outdoor unit wiring, power setup", price: 449, duration: "1.5 hrs", rating: 4.7, reviews: 280, image: "https://images.unsplash.com/photo-1631744007979-3aa9e7b48c81?w=600&q=80", process: ["Check power requirements", "Install stabilizer", "Wire outdoor unit", "Test AC startup"], deliveryTime: "30 MINS", jobType: "ELECTRICAL" },
      { slug: "other-electrical", name: "Other Electrical", description: "Any other electrical work not listed above", price: 249, duration: "Flexible", rating: 4.5, reviews: 150, image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80", process: ["Discuss requirements", "Safety assessment", "Complete work", "Test & handover"], deliveryTime: "20 MINS", jobType: "ELECTRICAL" }
    ]
  },
  {
    slug: "chef",
    name: "Chef / Cooking",
    iconKey: "ChefHat",
    color: "#EF4444",
    bg: "#FEF2F2",
    sortOrder: 6,
    services: [
      { slug: "home-cook", name: "Home Cook", description: "Daily meals, North Indian, South Indian, multi-cuisine", price: 8000, duration: "Monthly", rating: 4.9, reviews: 520, image: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&q=80", process: ["Menu planning", "Grocery assistance", "Cook daily meals", "Kitchen cleanup"], deliveryTime: "60 MINS", jobType: "OTHER" },
      { slug: "party-event-catering", name: "Party / Event Catering", description: "Small gatherings, 10-50 people, multi-dish setup", price: 2999, duration: "Per event", rating: 4.8, reviews: 310, image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&q=80", process: ["Menu finalisation", "Ingredient sourcing", "Cooking & plating", "Serving & cleanup"], deliveryTime: "75 MINS", jobType: "OTHER" },
      { slug: "festival-special", name: "Festival Special", description: "Sweets, snacks for Diwali, Eid, festivals and occasions", price: 1499, duration: "Per session", rating: 4.7, reviews: 280, image: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=600&q=80", process: ["Finalise menu", "Prepare ingredients", "Cook festive items", "Pack & serve"], deliveryTime: "70 MINS", jobType: "OTHER" },
      { slug: "live-counter", name: "Live Counter", description: "Dosa, chaat, BBQ live counter setup for parties", price: 3999, duration: "Per event", rating: 4.8, reviews: 190, image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80", process: ["Setup counter & equipment", "Prepare ingredients", "Live cooking for guests", "Pack up & clean"], deliveryTime: "90 MINS", jobType: "OTHER" },
      { slug: "other-chef-service", name: "Other Chef Service", description: "Any other cooking or chef service not listed above", price: 999, duration: "Flexible", rating: 4.6, reviews: 120, image: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&q=80", process: ["Discuss requirements", "Plan menu", "Cook as agreed", "Handover & cleanup"], deliveryTime: "60 MINS", jobType: "OTHER" }
    ]
  },
  {
    slug: "grooming",
    name: "Grooming",
    iconKey: "Scissors",
    color: "#EC4899",
    bg: "#FDF2F8",
    sortOrder: 7,
    services: [
      { slug: "haircut-hair-styling", name: "Haircut / Hair Styling", description: "Men & women haircut, styling, at-home service", price: 299, duration: "45 mins", rating: 4.7, reviews: 560, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80", process: ["Consult on style", "Wash & condition", "Cut & style", "Final look & dry"], deliveryTime: "30 MINS", jobType: "OTHER" },
      { slug: "facial-cleanup", name: "Facial / Cleanup", description: "Home facial services, skin cleanup and glow treatment", price: 499, duration: "1 hr", rating: 4.8, reviews: 420, image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=80", process: ["Skin assessment", "Cleanse & steam", "Apply facial pack", "Moisturise & finish"], deliveryTime: "30 MINS", jobType: "OTHER" },
      { slug: "manicure-pedicure", name: "Manicure / Pedicure", description: "Professional nail care, cuticle work, polish", price: 399, duration: "1 hr", rating: 4.7, reviews: 380, image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=80", process: ["Soak hands/feet", "Shape & buff nails", "Cuticle care", "Apply polish"], deliveryTime: "30 MINS", jobType: "OTHER" },
      { slug: "massage-therapy", name: "Massage Therapy", description: "Relaxation massage, pain relief, non-spa home service", price: 799, duration: "1 hr", rating: 4.9, reviews: 490, image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=80", process: ["Discuss pressure preference", "Warm-up strokes", "Deep tissue work", "Cool down & relax"], deliveryTime: "40 MINS", jobType: "OTHER" },
      { slug: "mehendi-artist", name: "Mehendi Artist", description: "Bridal mehendi, party designs, festival henna art", price: 599, duration: "1.5 hrs", rating: 4.8, reviews: 310, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80", process: ["Choose design", "Apply mehendi cone", "Fill detailed patterns", "Dry time & sealing"], deliveryTime: "45 MINS", jobType: "OTHER" },
      { slug: "makeup-artist", name: "Makeup Artist", description: "Party makeup, bridal assist, occasion makeup", price: 999, duration: "1.5 hrs", rating: 4.8, reviews: 350, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80", process: ["Skin prep & primer", "Foundation & contouring", "Eye & lip makeup", "Setting spray & finish"], deliveryTime: "45 MINS", jobType: "OTHER" },
      { slug: "waxing-threading", name: "Waxing / Threading", description: "Full body waxing, eyebrow threading, at-home service", price: 349, duration: "45 mins", rating: 4.6, reviews: 440, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80", process: ["Prep skin with powder", "Apply wax/thread area", "Remove & soothe skin", "Apply calming lotion"], deliveryTime: "30 MINS", jobType: "OTHER" },
      { slug: "senior-care-grooming", name: "Senior Care Grooming", description: "Nail trimming, basic hygiene care for elderly", price: 399, duration: "1 hr", rating: 4.9, reviews: 180, image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=80", process: ["Gentle assessment", "Nail & hair trim", "Hygiene care", "Comfort check"], deliveryTime: "35 MINS", jobType: "OTHER" },
      { slug: "other-grooming", name: "Other Grooming", description: "Any other beauty or grooming service not listed", price: 299, duration: "Flexible", rating: 4.5, reviews: 130, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80", process: ["Discuss requirements", "Prepare tools", "Complete service", "Review & payment"], deliveryTime: "25 MINS", jobType: "OTHER" }
    ]
  }
];

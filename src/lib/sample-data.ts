// Sample data for Corevix CRM

export const sampleLeads = [
  { id: "l1", firstName: "Carlos", lastName: "Méndez", company: "BrightSmile Dental", email: "carlos@brightsmile.com", phone: "+1 809-555-0101", whatsapp: "+18095550101", source: "Facebook Ads", status: "New", assignedUser: "Ana Rivera", estimatedValue: 15000, interestLevel: "High", serviceInterested: "Digital Marketing", tags: ["dental", "priority"], createdAt: "2026-04-28", lastContacted: null, nextFollowUp: "2026-05-03" },
  { id: "l2", firstName: "María", lastName: "Santos", company: "Santos Real Estate", email: "maria@santosrealty.com", phone: "+1 809-555-0102", whatsapp: "+18095550102", source: "Instagram", status: "Contacted", assignedUser: "Juan Pérez", estimatedValue: 45000, interestLevel: "Medium", serviceInterested: "Website Development", tags: ["real-estate"], createdAt: "2026-04-25", lastContacted: "2026-04-27", nextFollowUp: "2026-05-01" },
  { id: "l3", firstName: "Roberto", lastName: "Díaz", company: "Díaz & Partners Law", email: "rdiaz@diazlaw.com", phone: "+1 809-555-0103", whatsapp: "+18095550103", source: "Referral", status: "Qualified", assignedUser: "Ana Rivera", estimatedValue: 30000, interestLevel: "High", serviceInterested: "Branding", tags: ["law", "vip"], createdAt: "2026-04-20", lastContacted: "2026-04-26", nextFollowUp: "2026-04-30" },
  { id: "l4", firstName: "Lucía", lastName: "Fernández", company: "La Cocina de Lucía", email: "lucia@lacocina.com", phone: "+1 809-555-0104", whatsapp: "+18095550104", source: "WhatsApp", status: "Proposal Sent", assignedUser: "Juan Pérez", estimatedValue: 8000, interestLevel: "Medium", serviceInterested: "Social Media Management", tags: ["restaurant", "food"], createdAt: "2026-04-15", lastContacted: "2026-04-28", nextFollowUp: "2026-05-02" },
  { id: "l5", firstName: "Andrés", lastName: "Morales", company: "Morales Consulting", email: "andres@moralesconsulting.com", phone: "+1 809-555-0105", whatsapp: "+18095550105", source: "Website", status: "Negotiation", assignedUser: "Ana Rivera", estimatedValue: 25000, interestLevel: "High", serviceInterested: "CRM Implementation", tags: ["consulting"], createdAt: "2026-04-10", lastContacted: "2026-04-29", nextFollowUp: "2026-05-01" },
  { id: "l6", firstName: "Sofía", lastName: "Castillo", company: "StyleShop Online", email: "sofia@styleshop.com", phone: "+1 809-555-0106", whatsapp: "+18095550106", source: "Facebook Ads", status: "Won", assignedUser: "Juan Pérez", estimatedValue: 12000, interestLevel: "High", serviceInterested: "E-commerce Development", tags: ["ecommerce"], createdAt: "2026-03-28", lastContacted: "2026-04-20", nextFollowUp: null },
  { id: "l7", firstName: "Diego", lastName: "Ramírez", company: "FitLife Gym", email: "diego@fitlifegym.com", phone: "+1 809-555-0107", whatsapp: "+18095550107", source: "Instagram", status: "New", assignedUser: "Ana Rivera", estimatedValue: 6000, interestLevel: "Low", serviceInterested: "Social Media", tags: ["fitness"], createdAt: "2026-04-30", lastContacted: null, nextFollowUp: "2026-05-04" },
  { id: "l8", firstName: "Valentina", lastName: "Torres", company: "Torres Architecture", email: "val@torresarch.com", phone: "+1 809-555-0108", whatsapp: "+18095550108", source: "Referral", status: "Contacted", assignedUser: "Juan Pérez", estimatedValue: 35000, interestLevel: "High", serviceInterested: "Website + Branding", tags: ["architecture", "premium"], createdAt: "2026-04-22", lastContacted: "2026-04-29", nextFollowUp: "2026-05-02" },
  { id: "l9", firstName: "Gabriel", lastName: "Herrera", company: "AutoPlus", email: "gherrera@autoplus.com", phone: "+1 809-555-0109", whatsapp: "+18095550109", source: "Phone Call", status: "Lost", assignedUser: "Ana Rivera", estimatedValue: 20000, interestLevel: "Low", serviceInterested: "Digital Marketing", tags: ["automotive"], createdAt: "2026-03-15", lastContacted: "2026-04-10", nextFollowUp: null },
  { id: "l10", firstName: "Isabella", lastName: "Vargas", company: "Green Garden Nursery", email: "isabella@greengarden.com", phone: "+1 809-555-0110", whatsapp: "+18095550110", source: "Walk-in", status: "Proposal Needed", assignedUser: "Juan Pérez", estimatedValue: 5000, interestLevel: "Medium", serviceInterested: "Website", tags: ["retail"], createdAt: "2026-04-18", lastContacted: "2026-04-25", nextFollowUp: "2026-05-01" },
];

export const sampleClients = [
  { id: "c1", type: "Company", company: "BrightSmile Dental Clinic", contactPerson: "Dr. Carlos Méndez", email: "carlos@brightsmile.com", phone: "+1 809-555-0101", whatsapp: "+18095550101", address: "Av. Winston Churchill 45", city: "Santo Domingo", country: "Dominican Republic", taxId: "RNC-131-45678-9", website: "www.brightsmile.com", industry: "Healthcare", status: "Active", accountManager: "Ana Rivera", tags: ["dental", "premium"], createdAt: "2026-01-15" },
  { id: "c2", type: "Company", company: "Santos Real Estate Group", contactPerson: "María Santos", email: "maria@santosrealty.com", phone: "+1 809-555-0102", whatsapp: "+18095550102", address: "Calle El Conde 120", city: "Santo Domingo", country: "Dominican Republic", taxId: "RNC-131-56789-0", website: "www.santosrealty.com", industry: "Real Estate", status: "Active", accountManager: "Juan Pérez", tags: ["real-estate", "vip"], createdAt: "2025-11-20" },
  { id: "c3", type: "Company", company: "Díaz & Partners Law Firm", contactPerson: "Roberto Díaz", email: "rdiaz@diazlaw.com", phone: "+1 809-555-0103", whatsapp: "+18095550103", address: "Torre Empresarial Piso 12", city: "Santiago", country: "Dominican Republic", taxId: "RNC-131-67890-1", website: "www.diazlaw.com", industry: "Legal", status: "VIP", accountManager: "Ana Rivera", tags: ["law", "corporate"], createdAt: "2025-09-10" },
  { id: "c4", type: "Company", company: "La Cocina de Lucía", contactPerson: "Lucía Fernández", email: "lucia@lacocina.com", phone: "+1 809-555-0104", whatsapp: "+18095550104", address: "Av. Abraham Lincoln 78", city: "Santo Domingo", country: "Dominican Republic", taxId: "RNC-131-78901-2", website: "www.lacocina.com", industry: "Food & Beverage", status: "Active", accountManager: "Juan Pérez", tags: ["restaurant"], createdAt: "2026-02-01" },
  { id: "c5", type: "Company", company: "Morales Consulting Group", contactPerson: "Andrés Morales", email: "andres@moralesconsulting.com", phone: "+1 809-555-0105", whatsapp: "+18095550105", address: "Calle Duarte 234", city: "Santo Domingo", country: "Dominican Republic", taxId: "RNC-131-89012-3", website: "www.moralesconsulting.com", industry: "Consulting", status: "Active", accountManager: "Ana Rivera", tags: ["consulting"], createdAt: "2025-12-05" },
  { id: "c6", type: "Company", company: "StyleShop Online Store", contactPerson: "Sofía Castillo", email: "sofia@styleshop.com", phone: "+1 809-555-0106", whatsapp: "+18095550106", address: "Av. Lope de Vega 55", city: "Santo Domingo", country: "Dominican Republic", taxId: "RNC-131-90123-4", website: "www.styleshop.com", industry: "E-commerce", status: "Inactive", accountManager: "Juan Pérez", tags: ["ecommerce", "retail"], createdAt: "2025-08-15" },
];

export const sampleDeals = [
  { id: "d1", name: "BrightSmile Website Redesign", client: "BrightSmile Dental Clinic", value: 15000, probability: 80, expectedClose: "2026-05-15", assignedUser: "Ana Rivera", stage: "Proposal Sent", notes: "Client wants modern design with online booking", lastActivity: "2026-04-28", nextFollowUp: "2026-05-02" },
  { id: "d2", name: "Santos RE Digital Strategy", client: "Santos Real Estate Group", value: 45000, probability: 60, expectedClose: "2026-06-01", assignedUser: "Juan Pérez", stage: "Discovery", notes: "Multiple properties to showcase, needs virtual tours", lastActivity: "2026-04-27", nextFollowUp: "2026-05-01" },
  { id: "d3", name: "Díaz Law Branding Package", client: "Díaz & Partners Law Firm", value: 30000, probability: 90, expectedClose: "2026-05-10", assignedUser: "Ana Rivera", stage: "Negotiation", notes: "Full rebrand including logo, stationery, website", lastActivity: "2026-04-29", nextFollowUp: "2026-04-30" },
  { id: "d4", name: "La Cocina Social Media", client: "La Cocina de Lucía", value: 8000, probability: 70, expectedClose: "2026-05-20", assignedUser: "Juan Pérez", stage: "Proposal Preparation", notes: "3-month social media management contract", lastActivity: "2026-04-28", nextFollowUp: "2026-05-02" },
  { id: "d5", name: "Morales CRM Setup", client: "Morales Consulting Group", value: 25000, probability: 85, expectedClose: "2026-05-30", assignedUser: "Ana Rivera", stage: "Contract Sent", notes: "Custom CRM with integrations", lastActivity: "2026-04-29", nextFollowUp: "2026-05-01" },
  { id: "d6", name: "StyleShop E-commerce Upgrade", client: "StyleShop Online Store", value: 12000, probability: 95, expectedClose: "2026-05-05", assignedUser: "Juan Pérez", stage: "Won", notes: "Shopify migration completed", lastActivity: "2026-04-20", nextFollowUp: null },
  { id: "d7", name: "FitLife Gym Campaign", client: null, value: 6000, probability: 30, expectedClose: "2026-06-15", assignedUser: "Ana Rivera", stage: "New Opportunity", notes: "Initial inquiry about Facebook ads", lastActivity: "2026-04-30", nextFollowUp: "2026-05-04" },
  { id: "d8", name: "Torres Architecture Website", client: null, value: 35000, probability: 50, expectedClose: "2026-06-30", assignedUser: "Juan Pérez", stage: "Qualified", notes: "Premium portfolio site with 3D renders", lastActivity: "2026-04-29", nextFollowUp: "2026-05-02" },
];

export const pipelineStages = [
  "New Opportunity",
  "Discovery",
  "Qualified",
  "Proposal Preparation",
  "Proposal Sent",
  "Negotiation",
  "Contract Sent",
  "Won",
  "Lost",
];

export const sampleTasks = [
  { id: "t1", title: "Send proposal to BrightSmile", description: "Prepare and send website redesign proposal", relatedClient: "BrightSmile Dental Clinic", relatedLead: null, relatedProject: null, assignedUser: "Ana Rivera", priority: "High", status: "In Progress", dueDate: "2026-05-02", reminderDate: "2026-05-01", createdBy: "Admin", createdAt: "2026-04-28" },
  { id: "t2", title: "Follow up with Santos Real Estate", description: "Call to discuss digital strategy requirements", relatedClient: "Santos Real Estate Group", relatedLead: null, relatedProject: null, assignedUser: "Juan Pérez", priority: "Medium", status: "To Do", dueDate: "2026-05-01", reminderDate: "2026-04-30", createdBy: "Admin", createdAt: "2026-04-27" },
  { id: "t3", title: "Prepare Díaz Law contract", description: "Draft service agreement for branding project", relatedClient: "Díaz & Partners Law Firm", relatedLead: null, relatedProject: null, assignedUser: "Ana Rivera", priority: "Urgent", status: "To Do", dueDate: "2026-04-30", reminderDate: "2026-04-29", createdBy: "Admin", createdAt: "2026-04-26" },
  { id: "t4", title: "Design social media mockups", description: "Create sample posts for La Cocina de Lucía", relatedClient: "La Cocina de Lucía", relatedLead: null, relatedProject: null, assignedUser: "Juan Pérez", priority: "Medium", status: "In Progress", dueDate: "2026-05-03", reminderDate: "2026-05-02", createdBy: "Admin", createdAt: "2026-04-25" },
  { id: "t5", title: "Review CRM specifications", description: "Review tech specs for Morales CRM project", relatedClient: "Morales Consulting Group", relatedLead: null, relatedProject: "Morales CRM Implementation", assignedUser: "Ana Rivera", priority: "High", status: "Completed", dueDate: "2026-04-28", reminderDate: "2026-04-27", createdBy: "Admin", createdAt: "2026-04-20" },
  { id: "t6", title: "Send invoice to StyleShop", description: "Final invoice for e-commerce migration", relatedClient: "StyleShop Online Store", relatedLead: null, relatedProject: null, assignedUser: "Juan Pérez", priority: "Low", status: "Completed", dueDate: "2026-04-25", reminderDate: null, createdBy: "Admin", createdAt: "2026-04-21" },
  { id: "t7", title: "Onboard new lead - FitLife Gym", description: "Schedule intro call with FitLife Gym", relatedClient: null, relatedLead: "Diego Ramírez", relatedProject: null, assignedUser: "Ana Rivera", priority: "Medium", status: "To Do", dueDate: "2026-05-04", reminderDate: "2026-05-03", createdBy: "Admin", createdAt: "2026-04-30" },
];

export const sampleProjects = [
  { id: "p1", name: "BrightSmile Website Redesign", client: "BrightSmile Dental Clinic", manager: "Ana Rivera", startDate: "2026-05-01", dueDate: "2026-06-30", status: "Not Started", budget: 15000, description: "Complete website redesign with online booking system", progress: 0 },
  { id: "p2", name: "Morales CRM Implementation", client: "Morales Consulting Group", manager: "Ana Rivera", startDate: "2026-04-15", dueDate: "2026-07-15", status: "In Progress", budget: 25000, description: "Custom CRM setup with integrations and training", progress: 35 },
  { id: "p3", name: "Santos RE Marketing Campaign", client: "Santos Real Estate Group", manager: "Juan Pérez", startDate: "2026-03-01", dueDate: "2026-05-31", status: "In Progress", budget: 20000, description: "Digital marketing campaign including social media and Google Ads", progress: 65 },
  { id: "p4", name: "StyleShop E-commerce Migration", client: "StyleShop Online Store", manager: "Juan Pérez", startDate: "2026-02-01", dueDate: "2026-04-15", status: "Completed", budget: 12000, description: "Shopify migration from WooCommerce with data transfer", progress: 100 },
  { id: "p5", name: "Díaz Law Rebrand", client: "Díaz & Partners Law Firm", manager: "Ana Rivera", startDate: "2026-05-10", dueDate: "2026-08-10", status: "Not Started", budget: 30000, description: "Full rebrand including logo, website, and corporate identity", progress: 0 },
];

export const sampleProposals = [
  { id: "pr1", number: "PROP-2026-001", client: "BrightSmile Dental Clinic", title: "Website Redesign & Online Booking Platform", amount: 15000, status: "Sent", validUntil: "2026-05-15", assignedUser: "Ana Rivera", createdAt: "2026-04-20" },
  { id: "pr2", number: "PROP-2026-002", client: "Díaz & Partners Law Firm", title: "Complete Brand Identity Package", amount: 30000, status: "Viewed", validUntil: "2026-05-10", assignedUser: "Ana Rivera", createdAt: "2026-04-22" },
  { id: "pr3", number: "PROP-2026-003", client: "La Cocina de Lucía", title: "3-Month Social Media Management", amount: 8000, status: "Draft", validUntil: "2026-05-20", assignedUser: "Juan Pérez", createdAt: "2026-04-28" },
  { id: "pr4", number: "PROP-2026-004", client: "StyleShop Online Store", title: "Shopify E-commerce Migration", amount: 12000, status: "Accepted", validUntil: "2026-02-15", assignedUser: "Juan Pérez", createdAt: "2026-01-25" },
  { id: "pr5", number: "PROP-2026-005", client: "Torres Architecture", title: "Premium Portfolio Website", amount: 35000, status: "Sent", validUntil: "2026-05-30", assignedUser: "Juan Pérez", createdAt: "2026-04-29" },
];

export const sampleInvoices = [
  { id: "inv1", number: "INV-2026-001", client: "StyleShop Online Store", dateIssued: "2026-04-15", dueDate: "2026-05-15", subtotal: 12000, tax: 2160, discount: 0, total: 14160, status: "Paid" },
  { id: "inv2", number: "INV-2026-002", client: "Santos Real Estate Group", dateIssued: "2026-04-01", dueDate: "2026-05-01", subtotal: 10000, tax: 1800, discount: 500, total: 11300, status: "Overdue" },
  { id: "inv3", number: "INV-2026-003", client: "Morales Consulting Group", dateIssued: "2026-04-20", dueDate: "2026-05-20", subtotal: 8000, tax: 1440, discount: 0, total: 9440, status: "Sent" },
  { id: "inv4", number: "INV-2026-004", client: "Díaz & Partners Law Firm", dateIssued: "2026-03-15", dueDate: "2026-04-15", subtotal: 5000, tax: 900, discount: 0, total: 5900, status: "Paid" },
  { id: "inv5", number: "INV-2026-005", client: "BrightSmile Dental Clinic", dateIssued: "2026-04-28", dueDate: "2026-05-28", subtotal: 3000, tax: 540, discount: 0, total: 3540, status: "Draft" },
];

export const sampleWhatsAppConversations = [
  { id: "wa1", contact: "Dr. Carlos Méndez", phone: "+18095550101", client: "BrightSmile Dental Clinic", lastMessage: "Thank you! I'll review the proposal today.", lastMessageTime: "2026-04-30 14:30", unread: 0, status: "Resolved", assignedAgent: "Ana Rivera", tags: ["client", "proposal"] },
  { id: "wa2", contact: "María Santos", phone: "+18095550102", client: "Santos Real Estate Group", lastMessage: "Can we schedule a call for tomorrow?", lastMessageTime: "2026-04-30 11:15", unread: 2, status: "Open", assignedAgent: "Juan Pérez", tags: ["client", "urgent"] },
  { id: "wa3", contact: "Diego Ramírez", phone: "+18095550107", client: null, lastMessage: "Hi, I'm interested in your social media packages", lastMessageTime: "2026-04-30 09:00", unread: 1, status: "Open", assignedAgent: null, tags: ["new-lead"] },
  { id: "wa4", contact: "Lucía Fernández", phone: "+18095550104", client: "La Cocina de Lucía", lastMessage: "The mockups look great! Let's proceed.", lastMessageTime: "2026-04-29 16:45", unread: 0, status: "Pending", assignedAgent: "Juan Pérez", tags: ["client"] },
  { id: "wa5", contact: "Roberto Díaz", phone: "+18095550103", client: "Díaz & Partners Law Firm", lastMessage: "I need the contract by end of week please.", lastMessageTime: "2026-04-30 08:30", unread: 1, status: "Open", assignedAgent: "Ana Rivera", tags: ["vip", "urgent"] },
];

export const sampleEmails = [
  { id: "em1", from: "carlos@brightsmile.com", fromName: "Dr. Carlos Méndez", subject: "RE: Website Redesign Proposal", preview: "Thank you for the detailed proposal. I have a few questions...", date: "2026-04-30 10:00", read: true, client: "BrightSmile Dental Clinic", assignedUser: "Ana Rivera", status: "Read" },
  { id: "em2", from: "maria@santosrealty.com", fromName: "María Santos", subject: "Meeting Request - Digital Strategy", preview: "Hi, I'd like to schedule a meeting to discuss our digital...", date: "2026-04-30 09:30", read: false, client: "Santos Real Estate Group", assignedUser: "Juan Pérez", status: "Unread" },
  { id: "em3", from: "andres@moralesconsulting.com", fromName: "Andrés Morales", subject: "CRM Project Update Request", preview: "Can you provide a status update on the CRM implementation?", date: "2026-04-29 15:00", read: true, client: "Morales Consulting Group", assignedUser: "Ana Rivera", status: "Read" },
  { id: "em4", from: "rdiaz@diazlaw.com", fromName: "Roberto Díaz", subject: "Contract Review - Branding Project", preview: "I've reviewed the contract and have some amendments to discuss...", date: "2026-04-29 11:00", read: false, client: "Díaz & Partners Law Firm", assignedUser: "Ana Rivera", status: "Unread" },
  { id: "em5", from: "sofia@styleshop.com", fromName: "Sofía Castillo", subject: "Thank you - Great work!", preview: "The new Shopify store looks amazing! Thank you for...", date: "2026-04-28 14:00", read: true, client: "StyleShop Online Store", assignedUser: "Juan Pérez", status: "Read" },
];

export const sampleTeam = [
  { id: "u1", name: "Admin User", email: "admin@corevix.com", phone: "+1 809-555-0001", role: "Super Admin", department: "Management", status: "Active", assignedLeads: 0, assignedTasks: 2, lastLogin: "2026-04-30" },
  { id: "u2", name: "Ana Rivera", email: "ana@corevix.com", phone: "+1 809-555-0002", role: "Sales Agent", department: "Sales", status: "Active", assignedLeads: 5, assignedTasks: 4, lastLogin: "2026-04-30" },
  { id: "u3", name: "Juan Pérez", email: "juan@corevix.com", phone: "+1 809-555-0003", role: "Sales Agent", department: "Sales", status: "Active", assignedLeads: 5, assignedTasks: 3, lastLogin: "2026-04-30" },
  { id: "u4", name: "Laura García", email: "laura@corevix.com", phone: "+1 809-555-0004", role: "Project Manager", department: "Operations", status: "Active", assignedLeads: 0, assignedTasks: 6, lastLogin: "2026-04-29" },
  { id: "u5", name: "Miguel Reyes", email: "miguel@corevix.com", phone: "+1 809-555-0005", role: "Support Agent", department: "Support", status: "Active", assignedLeads: 0, assignedTasks: 3, lastLogin: "2026-04-30" },
  { id: "u6", name: "Carmen López", email: "carmen@corevix.com", phone: "+1 809-555-0006", role: "Viewer", department: "Finance", status: "Active", assignedLeads: 0, assignedTasks: 0, lastLogin: "2026-04-28" },
];

export const sampleActivities = [
  { id: "a1", action: "Lead created", detail: "Diego Ramírez - FitLife Gym", user: "System", time: "2026-04-30 09:00", type: "lead" },
  { id: "a2", action: "WhatsApp message received", detail: "Roberto Díaz - Contract inquiry", user: "System", time: "2026-04-30 08:30", type: "whatsapp" },
  { id: "a3", action: "Proposal sent", detail: "PROP-2026-005 to Torres Architecture", user: "Juan Pérez", time: "2026-04-29 16:00", type: "proposal" },
  { id: "a4", action: "Task completed", detail: "Review CRM specifications", user: "Ana Rivera", time: "2026-04-28 17:00", type: "task" },
  { id: "a5", action: "Deal moved", detail: "StyleShop E-commerce Upgrade → Won", user: "Juan Pérez", time: "2026-04-20 14:00", type: "deal" },
  { id: "a6", action: "Invoice paid", detail: "INV-2026-001 - StyleShop Online Store", user: "System", time: "2026-04-18 10:00", type: "invoice" },
  { id: "a7", action: "Client created", detail: "La Cocina de Lucía", user: "Juan Pérez", time: "2026-02-01 09:00", type: "client" },
  { id: "a8", action: "Email received", detail: "From Sofía Castillo - Thank you!", user: "System", time: "2026-04-28 14:00", type: "email" },
];

export const leadStatuses = ["New", "Contacted", "Qualified", "Proposal Needed", "Proposal Sent", "Negotiation", "Won", "Lost", "Not Interested"];
export const leadSources = ["WhatsApp", "Facebook Ads", "Instagram", "Website", "Referral", "Email", "Phone Call", "Walk-in", "Manual Entry", "Other"];
export const clientStatuses = ["Active", "Inactive", "Pending", "VIP", "Past Client"];
export const taskStatuses = ["To Do", "In Progress", "Waiting", "Completed", "Cancelled"];
export const taskPriorities = ["Low", "Medium", "High", "Urgent"];
export const projectStatuses = ["Not Started", "In Progress", "Waiting on Client", "On Hold", "Completed", "Cancelled"];
export const proposalStatuses = ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired"];
export const invoiceStatuses = ["Draft", "Sent", "Paid", "Partially Paid", "Overdue", "Cancelled"];

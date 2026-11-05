import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD environment variable is required to seed the admin user.');
  }

  const modules = [
    'Dashboard',
    'Products',
    'Categories',
    'Brands',
    'Inventory',
    'Analytics',
    'Attributes',
    'Users',
    'Roles',
    'Permissions',
    'Settings',
    'Security',
    'Orders',
    'Customers',
    'Coupons',
    'Promotions',
    'Marketing',
    'Banners',
    'Popups',
    'Sessions',
    'AuditLogs',
    'Media',
    'Blog',
    'CMS',
    'LandingPages',
    'FAQ',
    'SEO',
    'Payments',
    'Refunds',
    'Returns',
    'Shipments',
    'Notifications'
  ];
  const actions = ['read', 'write', 'delete'];

  console.log('Seeding Permissions...');

  const createdPermissions = [];
  for (const mod of modules) {
    for (const action of actions) {
      const permissionName = `${action}_${mod.toLowerCase()}`;
      const permission = await prisma.permission.upsert({
        where: { name: permissionName },
        update: {},
        create: {
          name: permissionName,
          module: mod,
          action: action,
          description: `Can ${action} ${mod.toLowerCase()}`,
        },
      });
      createdPermissions.push({ id: permission.id, module: mod, action: action });
    }
  }

  console.log('Seeding Roles...');

  // Helper to map permission names
  const getPermissionsByFilter = (filterFn: (p: { module: string; action: string }) => boolean) => {
    return createdPermissions.filter((p) => filterFn({ module: p.module, action: p.action }));
  };

  const rolesToSeed = [
    {
      name: 'SuperAdmin',
      description: 'Super Administrator with full unrestricted platform access',
      permissions: createdPermissions,
    },
    {
      name: 'Admin',
      description: 'System Administrator with standard administrative access',
      permissions: createdPermissions,
    },
    {
      name: 'InventoryManager',
      description: 'Manages products, variants, categories, brands, and warehouse stock',
      permissions: getPermissionsByFilter((p) =>
        ['Products', 'Categories', 'Brands', 'Inventory', 'Media'].includes(p.module)
      ),
    },
    {
      name: 'MarketingManager',
      description: 'Manages promotional campaigns, coupons, marketing, banners, and analytics',
      permissions: getPermissionsByFilter(
        (p) =>
          ['Analytics', 'Coupons', 'Promotions', 'Marketing', 'Banners', 'Popups', 'Media', 'Blog', 'CMS'].includes(p.module) ||
          (['Products', 'Categories', 'Brands'].includes(p.module) && p.action === 'read')
      ),
    },
    {
      name: 'SupportAgent',
      description: 'Customer service agent with catalog, orders, and customer view access',
      permissions: getPermissionsByFilter((p) => p.action === 'read' || ['Orders', 'Customers'].includes(p.module)),
    },
    {
      name: 'Viewer',
      description: 'Read-only viewer for operational dashboards',
      permissions: getPermissionsByFilter((p) => p.action === 'read'),
    },
  ];

  let superAdminRole = null;

  for (const roleDef of rolesToSeed) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        permissions: {
          set: roleDef.permissions.map((p) => ({ id: p.id })),
        },
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        permissions: {
          connect: roleDef.permissions.map((p) => ({ id: p.id })),
        },
      },
    });

    if (roleDef.name === 'SuperAdmin') {
      superAdminRole = role;
    }
  }

  console.log('Seeding SuperAdmin User...');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: passwordHash,
      roleId: superAdminRole!.id,
    },
    create: {
      email: adminEmail,
      passwordHash: passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      roleId: superAdminRole!.id,
      isActive: true,
    },
  });

  console.log(`Admin User seeded successfully: ${adminUser.email}`);

  // Seed sample category & products if none exist
  let category = await prisma.category.findFirst();
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and gadgets',
      },
    });
  }

  let product1 = await prisma.product.findFirst({ where: { name: 'Pro Wireless Headphones' } });
  if (!product1) {
    product1 = await prisma.product.create({
      data: {
        name: 'Pro Wireless Headphones',
        slug: 'pro-wireless-headphones',
        price: 199.99,
        sku: 'HD-PRO-01',
        description: 'High-fidelity noise cancelling wireless headphones.',
        categoryId: category.id,
      },
    });
  }

  let product2 = await prisma.product.findFirst({ where: { name: 'Ergonomic Mechanical Keyboard' } });
  if (!product2) {
    product2 = await prisma.product.create({
      data: {
        name: 'Ergonomic Mechanical Keyboard',
        slug: 'ergonomic-mechanical-keyboard',
        price: 149.50,
        sku: 'KB-ERG-02',
        description: 'Tactile mechanical keyboard with customizable RGB backlighting.',
        categoryId: category.id,
      },
    });
  }

  // Seed Customers
  const customerData = [
    {
      email: 'alex.smith@example.com',
      firstName: 'Alex',
      lastName: 'Smith',
      phone: '+1 (555) 234-5678',
      shippingAddress: '123 Tech Blvd, Suite 100, San Francisco, CA 94107',
      billingAddress: '123 Tech Blvd, Suite 100, San Francisco, CA 94107',
      notes: 'VIP Customer. Prefers express shipping.',
    },
    {
      email: 'sarah.johnson@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '+1 (555) 876-5432',
      shippingAddress: '456 Innovation Way, Austin, TX 78701',
      billingAddress: '456 Innovation Way, Austin, TX 78701',
      notes: 'Frequent buyer, corporate account.',
    },
    {
      email: 'michael.brown@example.com',
      firstName: 'Michael',
      lastName: 'Brown',
      phone: '+1 (555) 432-1098',
      shippingAddress: '789 Market St, Apt 4B, New York, NY 10001',
      billingAddress: '789 Market St, Apt 4B, New York, NY 10001',
      notes: 'Inquired about wholesale discounts.',
    },
  ];

  for (const c of customerData) {
    const cust = await prisma.customer.upsert({
      where: { email: c.email },
      update: {},
      create: c,
    });

    // Check if customer already has orders
    const existingOrders = await prisma.order.count({ where: { customerId: cust.id } });
    if (existingOrders === 0) {
      if (c.email === 'alex.smith@example.com') {
        const order1 = await prisma.order.create({
          data: {
            orderNumber: 'ORD-1001',
            customerId: cust.id,
            status: 'Processing',
            paymentStatus: 'Paid',
            paymentMethod: 'Credit Card (Stripe)',
            totalAmount: 349.49,
            shippingAddress: cust.shippingAddress,
            billingAddress: cust.billingAddress,
            assignedStaffId: adminUser.id,
            internalNotes: 'Customer verified address. Priority dispatch required.',
            items: {
              create: [
                { productId: product1.id, quantity: 1, price: 199.99 },
                { productId: product2.id, quantity: 1, price: 149.50 },
              ],
            },
            timeline: {
              create: [
                { status: 'Pending', action: 'Order created by customer online', userName: cust.email },
                { status: 'Paid', action: 'Payment verified via Stripe ($349.49)', userName: 'System' },
                { status: 'Processing', action: 'Status updated to Processing and assigned to Super Admin', userId: adminUser.id, userName: 'Super Admin' },
              ],
            },
            orderNotes: {
              create: [
                { note: 'Express delivery label requested.', author: 'Super Admin' },
              ],
            },
          },
        });
      } else if (c.email === 'sarah.johnson@example.com') {
        await prisma.order.create({
          data: {
            orderNumber: 'ORD-1002',
            customerId: cust.id,
            status: 'Shipped',
            paymentStatus: 'Paid',
            paymentMethod: 'PayPal',
            totalAmount: 199.99,
            shippingAddress: cust.shippingAddress,
            billingAddress: cust.billingAddress,
            assignedStaffId: adminUser.id,
            internalNotes: 'Shipped via FedEx Ground tracking #FX-982341.',
            items: {
              create: [
                { productId: product1.id, quantity: 1, price: 199.99 },
              ],
            },
            timeline: {
              create: [
                { status: 'Pending', action: 'Order created online', userName: cust.email },
                { status: 'Paid', action: 'Payment received via PayPal', userName: 'System' },
                { status: 'Packed', action: 'Items packed in warehouse', userId: adminUser.id, userName: 'Super Admin' },
                { status: 'Shipped', action: 'Package handed to carrier FedEx #FX-982341', userId: adminUser.id, userName: 'Super Admin' },
              ],
            },
          },
        });
      } else if (c.email === 'michael.brown@example.com') {
        await prisma.order.create({
          data: {
            orderNumber: 'ORD-1003',
            customerId: cust.id,
            status: 'Pending',
            paymentStatus: 'Unpaid',
            paymentMethod: 'Bank Transfer',
            totalAmount: 149.50,
            shippingAddress: cust.shippingAddress,
            billingAddress: cust.billingAddress,
            internalNotes: 'Awaiting manual bank deposit confirmation.',
            items: {
              create: [
                { productId: product2.id, quantity: 1, price: 149.50 },
              ],
            },
            timeline: {
              create: [
                { status: 'Pending', action: 'Order created with Bank Transfer option', userName: cust.email },
              ],
            },
          },
        });
      }
    }
  }

  console.log('Seeding Default Site Settings...');

  let brandingSetting = await prisma.brandingSetting.findFirst();
  if (!brandingSetting) {
    await prisma.brandingSetting.create({
      data: {
        siteName: 'Enterprise Store',
        siteTitle: 'Enterprise E-Commerce Store',
        siteTagline: 'High Performance Modular E-Commerce Platform',
        siteDescription: 'Shop high quality equipment and accessories.',
        primaryColor: '#0f172a',
        footerText: '© 2026 Enterprise Store. All rights reserved.',
        defaultLanguage: 'en',
        defaultCurrency: 'BDT',
        defaultTimezone: 'UTC',
      },
    });
  }

  let seoSetting = await prisma.sEOSetting.findFirst();
  if (!seoSetting) {
    await prisma.sEOSetting.create({
      data: {
        metaTitle: 'Enterprise E-Commerce Store',
        metaDescription: 'Shop high quality equipment and accessories with fast delivery.',
        metaKeywords: 'ecommerce, shop, online store, modular gear',
        canonicalUrl: 'https://mystore.com',
        robotsTxt: 'User-agent: *\nDisallow: /admin/\nDisallow: /checkout/',
      },
    });
  }

  let globalSeo = await prisma.globalSeoSettings.findFirst();
  if (!globalSeo) {
    await prisma.globalSeoSettings.create({
      data: {
        siteTitle: 'Enterprise E-Commerce Store',
        siteDescription: 'Shop high quality equipment and accessories with fast delivery.',
        metaKeywords: 'ecommerce, shop, online store, modular gear',
        robotsConfig: 'User-agent: *\nDisallow: /admin/\nDisallow: /checkout/',
      },
    });
  }

  let storeSetting = await prisma.storeSetting.findFirst();
  if (!storeSetting) {
    await prisma.storeSetting.create({
      data: {
        whatsappOrderNumber: '+8801712345678',
        callOrderNumber: '+8801812345678',
        supportEmail: 'support@mystore.com',
        supportPhone: '+8801812345678',
        address: 'House 12, Road 5, Block B, Banani',
        city: 'Dhaka',
        country: 'Bangladesh',
        location: '23.7937, 90.4066',
        facebookUrl: 'https://facebook.com/mystore',
        instagramUrl: 'https://instagram.com/mystore',
      },
    });
  }

  let shippingSetting = await prisma.shippingSetting.findFirst();
  if (!shippingSetting) {
    await prisma.shippingSetting.create({
      data: {
        insideDhakaCharge: 60,
        outsideDhakaCharge: 120,
        defaultShippingCost: 60,
        freeShippingThreshold: 2000,
        freeShippingEnabled: true,
        enableFreeShipping: true,
      },
    });
  }

  let taxSetting = await prisma.taxSetting.findFirst();
  if (!taxSetting) {
    await prisma.taxSetting.create({
      data: {
        defaultTaxRate: 0,
        pricesIncludeTax: false,
        taxEnabled: true,
        enableTax: true,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

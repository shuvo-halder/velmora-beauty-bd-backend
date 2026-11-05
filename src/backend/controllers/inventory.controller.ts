import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/db";

export const getLowStock = asyncHandler(async (req: Request, res: Response) => {
  const lowStock = await prisma.inventory.findMany({
    where: {
      quantityAvailable: {
        lte: prisma.inventory.fields.lowStockThreshold
      },
      AND: [
        {
          quantityAvailable: {
            gt: 0
          }
        }
      ]
    },
    include: {
      product: true,
      variant: {
        include: {
          product: true
        }
      },
      warehouse: true
    }
  });

  res.status(200).json({ success: true, data: lowStock });
});

export const getOutOfStock = asyncHandler(async (req: Request, res: Response) => {
  const outOfStock = await prisma.inventory.findMany({
    where: {
      quantityAvailable: {
        lte: 0
      }
    },
    include: {
      product: true,
      variant: {
        include: {
          product: true
        }
      },
      warehouse: true
    }
  });

  res.status(200).json({ success: true, data: outOfStock });
});

export const getInventoryValue = asyncHandler(async (req: Request, res: Response) => {
  const inventories = await prisma.inventory.findMany({
    where: {
      quantityAvailable: {
        gt: 0
      }
    },
    include: {
      product: true,
      variant: true
    }
  });

  let totalValue = 0;
  for (const inv of inventories) {
    let price = 0;
    if (inv.variant && inv.variant.price) {
      price = Number(inv.variant.price);
    } else if (inv.product && inv.product.price) {
      price = Number(inv.product.price);
    }
    totalValue += (inv.quantityAvailable * price);
  }

  res.status(200).json({ success: true, data: { totalValue } });
});

export const getAllInventory = asyncHandler(async (req: Request, res: Response) => {
  const inventory = await prisma.inventory.findMany({
    include: {
      product: true,
      variant: {
        include: {
          product: true
        }
      },
      warehouse: true
    }
  });

  res.status(200).json({ success: true, data: inventory });
});

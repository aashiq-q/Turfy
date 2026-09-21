import { Router, type IRouter } from "express";
import { and, desc, eq, gte, ilike, lte, lt, or } from "drizzle-orm";
import { db, bookingsTable, reviewsTable, turfBlocksTable, turfsTable } from "@workspace/db";
import {
  CreateBookingBody,
  CreateBookingResponse,
  CreateReviewBody,
  CreateReviewResponse,
  CreateTurfBlockBody,
  CreateTurfBlockResponse,
  CreateTurfBody,
  CreateTurfResponse,
  GetAvailabilityParams,
  GetAvailabilityQueryParams,
  GetAvailabilityResponse,
  GetDashboardSummaryResponse,
  GetTurfParams,
  GetTurfResponse,
  ListBookingsQueryParams,
  ListBookingsResponse,
  ListReviewsQueryParams,
  ListReviewsResponse,
  ListTurfsQueryParams,
  ListTurfsResponse,
  ReplyToReviewBody,
  ReplyToReviewParams,
  ReplyToReviewResponse,
  UpdateTurfApprovalBody,
  UpdateTurfApprovalParams,
  UpdateTurfApprovalResponse,
  UpdateTurfBody,
  UpdateTurfParams,
  UpdateTurfResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const asNumber = (value: string | number) => Number(value);

function turfResponse(turf: typeof turfsTable.$inferSelect) {
  return {
    ...turf,
    rating: asNumber(turf.rating),
    startingPrice: asNumber(turf.startingPrice),
  };
}

function bookingResponse(booking: typeof bookingsTable.$inferSelect) {
  return {
    ...booking,
    amount: asNumber(booking.amount),
    commission: asNumber(booking.commission),
  };
}

async function seedDemoData(): Promise<void> {
  const existing = await db.select({ id: turfsTable.id }).from(turfsTable).limit(1);
  if (existing.length > 0) return;

  const [skyline, monsoon] = await db
    .insert(turfsTable)
    .values([
      {
        name: "Skyline Arena",
        location: "Outer Ring Road, Mahadevapura",
        city: "Bengaluru",
        description:
          "A high-energy 5-a-side arena with fast turf, bright floodlights, and enough room for the whole squad to warm up.",
        imageUrl: "/images/skyline_arena.jpg",
        gallery: ["/images/skyline_arena.jpg"],
        games: ["Football", "Box cricket"],
        amenities: ["Floodlights", "Changing rooms", "Parking"],
        rating: "4.8",
        reviewCount: 126,
        startingPrice: "899",
        ownerName: "Rohan Mehta",
        approvalStatus: "approved",
      },
      {
        name: "Monsoon Cricket Club",
        location: "Kalyan Nagar, HRBR Layout",
        city: "Bengaluru",
        description:
          "A covered cricket ground made for weekend leagues, late-night nets, and the kind of games nobody wants to end.",
        imageUrl: "/images/monsoon_cricket.jpg",
        gallery: ["/images/monsoon_cricket.jpg"],
        games: ["Cricket", "Box cricket"],
        amenities: ["Covered pitch", "Bowling machine", "Cafe"],
        rating: "4.6",
        reviewCount: 84,
        startingPrice: "699",
        ownerName: "Aarav Sports",
        approvalStatus: "approved",
      },
    ])
    .returning();

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  const end = new Date(tomorrow);
  end.setHours(19, 30, 0, 0);

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      turfId: skyline.id,
      turfName: skyline.name,
      game: "Football",
      startTime: tomorrow,
      endTime: end,
      players: 10,
      amount: "1798",
      commission: "179.8",
      status: "confirmed",
      paymentStatus: "paid",
    })
    .returning();

  await db.insert(reviewsTable).values([
    {
      turfId: skyline.id,
      bookingId: booking.id,
      authorName: "Ananya S.",
      rating: 5,
      comment: "Fast turf, great lights, and the booking was completely painless.",
    },
    {
      turfId: monsoon.id,
      bookingId: booking.id,
      authorName: "Vikram P.",
      rating: 4,
      comment: "Good covered pitch and friendly staff. The cafe is a nice touch.",
    },
  ]);
}

router.get("/turfs", async (req, res): Promise<void> => {
  await seedDemoData();
  const parsed = ListTurfsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, location, game, maxPrice } = parsed.data;
  const filters = [
    eq(turfsTable.approvalStatus, "approved"),
    search
      ? or(ilike(turfsTable.name, `%${search}%`), ilike(turfsTable.location, `%${search}%`))
      : undefined,
    location ? ilike(turfsTable.city, `%${location}%`) : undefined,
    maxPrice !== undefined ? undefined : undefined,
  ].filter(Boolean);
  const turfs = await db.select().from(turfsTable).where(and(...filters));
  const result = turfs
    .map(turfResponse)
    .filter((turf) => !game || turf.games.some((availableGame) => availableGame.toLowerCase() === game.toLowerCase()))
    .filter((turf) => maxPrice === undefined || turf.startingPrice <= maxPrice);
  res.json(ListTurfsResponse.parse(result));
});

router.post("/turfs", async (req, res): Promise<void> => {
  const parsed = CreateTurfBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [turf] = await db
    .insert(turfsTable)
    .values({
      ...parsed.data,
      gallery: [parsed.data.imageUrl],
      amenities: [],
      ownerName: "Demo owner",
      approvalStatus: "pending",
      startingPrice: String(parsed.data.startingPrice),
    })
    .returning();
  res.status(201).json(CreateTurfResponse.parse(turfResponse(turf)));
});

router.get("/turfs/:turfId", async (req, res): Promise<void> => {
  await seedDemoData();
  const params = GetTurfParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, params.data.turfId));
  if (!turf) {
    res.status(404).json({ error: "Turf not found" });
    return;
  }
  res.json(GetTurfResponse.parse(turfResponse(turf)));
});

router.patch("/turfs/:turfId", async (req, res): Promise<void> => {
  const params = UpdateTurfParams.safeParse(req.params);
  const body = UpdateTurfBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const updateData = {
    ...(body.data.name === undefined ? {} : { name: body.data.name }),
    ...(body.data.description === undefined ? {} : { description: body.data.description }),
    ...(body.data.imageUrl === undefined ? {} : { imageUrl: body.data.imageUrl }),
    ...(body.data.games === undefined ? {} : { games: body.data.games }),
    ...(body.data.startingPrice === undefined ? {} : { startingPrice: String(body.data.startingPrice) }),
  };
  const [turf] = await db.update(turfsTable).set(updateData).where(eq(turfsTable.id, params.data.turfId)).returning();
  if (!turf) {
    res.status(404).json({ error: "Turf not found" });
    return;
  }
  res.json(UpdateTurfResponse.parse(turfResponse(turf)));
});

router.get("/turfs/:turfId/availability", async (req, res): Promise<void> => {
  await seedDemoData();
  const params = GetAvailabilityParams.safeParse(req.params);
  const query = GetAvailabilityQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, params.data.turfId));
  if (!turf) {
    res.status(404).json({ error: "Turf not found" });
    return;
  }

  const dayStart = new Date(`${query.data.date}T00:00:00`);
  const dayEnd = new Date(`${query.data.date}T23:59:59`);
  const blocks = await db
    .select()
    .from(turfBlocksTable)
    .where(
      and(
        eq(turfBlocksTable.turfId, turf.id),
        or(
          and(gte(turfBlocksTable.startTime, dayStart), lte(turfBlocksTable.startTime, dayEnd)),
          and(gte(turfBlocksTable.endTime, dayStart), lte(turfBlocksTable.endTime, dayEnd)),
        ),
      ),
    );
  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.turfId, turf.id),
        or(
          and(gte(bookingsTable.startTime, dayStart), lte(bookingsTable.startTime, dayEnd)),
          and(gte(bookingsTable.endTime, dayStart), lte(bookingsTable.endTime, dayEnd)),
        ),
      ),
    );

  const slots = Array.from({ length: 15 }, (_, index) => {
    const start = new Date(dayStart);
    start.setHours(7 + index, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1, 0, 0, 0);
    const blocked = blocks.find((block) => start < block.endTime && end > block.startTime);
    const booked = bookings.find((booking) => start < booking.endTime && end > booking.startTime);
    const price = asNumber(turf.startingPrice) + (start.getHours() >= 18 ? 300 : 0);
    return {
      id: `${turf.id}-${start.toISOString()}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      price,
      available: !blocked && !booked,
      label: `${start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`,
      reason: blocked ? blocked.reason : booked ? "booked" : null,
    };
  });
  res.json(GetAvailabilityResponse.parse(slots));
});

router.post("/turfs/:turfId/blocks", async (req, res): Promise<void> => {
  const params = GetTurfParams.safeParse(req.params);
  const body = CreateTurfBlockBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [block] = await db
    .insert(turfBlocksTable)
    .values({ ...body.data, turfId: params.data.turfId })
    .returning();
  res.status(201).json(CreateTurfBlockResponse.parse(block));
});

router.patch("/turfs/:turfId/approval", async (req, res): Promise<void> => {
  const params = UpdateTurfApprovalParams.safeParse(req.params);
  const body = UpdateTurfApprovalBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [turf] = await db
    .update(turfsTable)
    .set({ approvalStatus: body.data.status })
    .where(eq(turfsTable.id, params.data.turfId))
    .returning();
  if (!turf) {
    res.status(404).json({ error: "Turf not found" });
    return;
  }
  res.json(UpdateTurfApprovalResponse.parse(turfResponse(turf)));
});

router.get("/bookings", async (req, res): Promise<void> => {
  await seedDemoData();
  const parsed = ListBookingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(
      parsed.data.status
        ? eq(bookingsTable.status, parsed.data.status as "pending" | "confirmed" | "completed" | "cancelled")
        : undefined,
    )
    .orderBy(desc(bookingsTable.startTime));
  res.json(ListBookingsResponse.parse(bookings.map(bookingResponse)));
});

router.post("/bookings", async (req, res): Promise<void> => {
  await seedDemoData();
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, parsed.data.turfId));
  if (!turf) {
    res.status(404).json({ error: "Turf not found" });
    return;
  }
  const amount = Number(parsed.data.amount);
  const [booking] = await db
    .insert(bookingsTable)
    .values({
      ...parsed.data,
      turfName: turf.name,
      amount: amount.toFixed(2),
      commission: (amount * 0.1).toFixed(2),
      status: "confirmed",
      paymentStatus: "paid",
    })
    .returning();
  res.status(201).json(CreateBookingResponse.parse(bookingResponse(booking)));
});

router.get("/reviews", async (req, res): Promise<void> => {
  await seedDemoData();
  const parsed = ListReviewsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.turfId, parsed.data.turfId))
    .orderBy(desc(reviewsTable.createdAt));
  res.json(ListReviewsResponse.parse(reviews));
});

router.post("/reviews", async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [review] = await db
    .insert(reviewsTable)
    .values({ ...parsed.data, authorName: "You" })
    .returning();
  res.status(201).json(CreateReviewResponse.parse(review));
});

router.post("/reviews/:reviewId/reply", async (req, res): Promise<void> => {
  const params = ReplyToReviewParams.safeParse(req.params);
  const body = ReplyToReviewBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [review] = await db
    .update(reviewsTable)
    .set({ ownerReply: body.data.reply })
    .where(eq(reviewsTable.id, params.data.reviewId))
    .returning();
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  res.json(ReplyToReviewResponse.parse(review));
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  await seedDemoData();
  const turfs = await db.select().from(turfsTable);
  const bookings = await db.select().from(bookingsTable);
  const upcoming = bookings.filter((booking) => booking.startTime > new Date() && booking.status !== "cancelled");
  const grossRevenue = bookings.reduce((total, booking) => total + asNumber(booking.amount), 0);
  const platformCommission = bookings.reduce((total, booking) => total + asNumber(booking.commission), 0);
  res.json(
    GetDashboardSummaryResponse.parse({
      approvedTurfs: turfs.filter((turf) => turf.approvalStatus === "approved").length,
      pendingApprovals: turfs.filter((turf) => turf.approvalStatus === "pending").length,
      upcomingBookings: upcoming.length,
      grossRevenue,
      platformCommission,
    }),
  );
});

export default router;
import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { AppEnv } from '../types.js';

export const communitiesRouter = new Hono<AppEnv>();

const createCommunitySchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(1000),
    location_tags: z.string().min(1).max(200),
});

// GET /api/communities — List all communities
communitiesRouter.get('/', async (c) => {
    const search = c.req.query('search');
    const communities = await prisma.community.findMany({
        where: search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { location_tags: { contains: search, mode: 'insensitive' } },
            ],
        } : undefined,
        include: {
            _count: { select: { members: true, offers: true } },
        },
        orderBy: { created_at: 'desc' },
    });

    return c.json(communities);
});

// GET /api/communities/:id — Community detail
communitiesRouter.get('/:id', async (c) => {
    const id = c.req.param('id');

    const community = await prisma.community.findUnique({
        where: { id },
        include: {
            members: {
                include: { user: { select: { tg_id: true, name: true, username: true, c_index: true, role: true } } },
            },
            offers: { where: { is_active: true }, orderBy: { created_at: 'desc' } },
            _count: { select: { members: true, offers: true } },
        },
    });

    if (!community) return c.json({ error: 'Community not found' }, 404);

    return c.json(serializeCommunity(community));
});

// POST /api/communities — Create community
communitiesRouter.post('/', async (c) => {
    const userId = c.get('userId') as bigint;
    const body = await c.req.json();
    const data = createCommunitySchema.parse(body);

    const community = await prisma.community.create({
        data: {
            ...data,
            members: {
                create: { user_id: userId, is_admin: true },
            },
        },
        include: { _count: { select: { members: true, offers: true } } },
    });

    return c.json(community, 201);
});

// POST /api/communities/:id/join — Join community
communitiesRouter.post('/:id/join', async (c) => {
    const userId = c.get('userId') as bigint;
    const communityId = c.req.param('id');

    const existing = await prisma.communityMember.findUnique({
        where: { user_id_community_id: { user_id: userId, community_id: communityId } },
    });

    if (existing) return c.json({ error: 'Already a member' }, 409);

    await prisma.communityMember.create({
        data: { user_id: userId, community_id: communityId },
    });

    return c.json({ success: true });
});

// POST /api/communities/:id/leave — Leave community
communitiesRouter.post('/:id/leave', async (c) => {
    const userId = c.get('userId') as bigint;
    const communityId = c.req.param('id');

    await prisma.communityMember.deleteMany({
        where: { user_id: userId, community_id: communityId },
    });

    return c.json({ success: true });
});

// PATCH /api/communities/:id/member/:userId — Update member role
communitiesRouter.patch('/:id/member/:memberId', async (c) => {
    const currentUserId = c.get('userId') as bigint;
    const communityId = c.req.param('id');
    const memberId = BigInt(c.req.param('memberId'));

    // Check if current user is admin
    const currentMember = await prisma.communityMember.findUnique({
        where: { user_id_community_id: { user_id: currentUserId, community_id: communityId } },
    });
    if (!currentMember?.is_admin) return c.json({ error: 'Not an admin' }, 403);

    const body = await c.req.json();
    const updates: any = {};
    if (body.is_admin !== undefined) updates.is_admin = Boolean(body.is_admin);
    if (body.is_treasurer !== undefined) updates.is_treasurer = Boolean(body.is_treasurer);

    const member = await prisma.communityMember.update({
        where: { user_id_community_id: { user_id: memberId, community_id: communityId } },
        data: updates,
    });

    return c.json({ ...member, user_id: member.user_id.toString() });
});

function serializeCommunity(community: any) {
    return {
        ...community,
        members: community.members?.map((m: any) => ({
            ...m,
            user_id: m.user_id.toString(),
            user: m.user ? { ...m.user, tg_id: m.user.tg_id.toString() } : undefined,
        })),
        offers: community.offers?.map((o: any) => ({
            ...o,
            producer_id: o.producer_id.toString(),
        })),
    };
}

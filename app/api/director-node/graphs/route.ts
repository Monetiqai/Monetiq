import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

/**
 * GET /api/director-node/graphs?project_id=<uuid>
 * List all graphs for a project (or all user graphs if project_id omitted)
 */
export async function GET(req: NextRequest) {
    try {
        // Get current user with caching to prevent rate limit errors
        const supabase = await supabaseServer();
        const user = await getAuthenticatedUser(supabase);
        if (!user) {
            console.error('[Director Node] Auth error: No user');
            return NextResponse.json(
                { error: 'Unauthorized - Please log in' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('project_id');

        // Build query - filter by project_id if provided, otherwise return all user graphs
        let query = supabase
            .from('director_node_graphs')
            .select('*')
            .order('updated_at', { ascending: false });

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data: graphs, error } = await query;

        if (error) {
            console.error('[Director Node] Error fetching graphs:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return NextResponse.json(
                { error: 'Failed to fetch graphs', details: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ graphs: graphs || [] });
    } catch (error: any) {
        console.error('[Director Node] GET /graphs error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/director-node/graphs
 * Create a new graph
 * 
 * Body: {
 *   project_id?: string, // Optional, can be null
 *   name: string,
 *   graph_json: { 
 *     version: "v1",
 *     nodes: [], 
 *     edges: [], 
 *     metadata?: {} 
 *   }
 * }
 */
export async function POST(req: NextRequest) {
    try {
        // Get current user with caching to prevent rate limit errors
        const supabase = await supabaseServer();
        const user = await getAuthenticatedUser(supabase);
        if (!user) {
            console.error('[Director Node] Auth error: No user');
            return NextResponse.json(
                { error: 'Unauthorized - Please log in' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { project_id, name, graph_json } = body;

        // Validation: name is required
        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                { error: 'name (string) is required' },
                { status: 400 }
            );
        }

        // Validation: graph_json is required
        if (!graph_json || typeof graph_json !== 'object') {
            return NextResponse.json(
                { error: 'graph_json (object) is required' },
                { status: 400 }
            );
        }

        // Validation: graph_json must have version: "v1"
        if (graph_json.version !== 'v1') {
            return NextResponse.json(
                { error: 'graph_json.version must be "v1"' },
                { status: 400 }
            );
        }

        // Validation: graph_json must have nodes and edges arrays
        if (!Array.isArray(graph_json.nodes) || !Array.isArray(graph_json.edges)) {
            return NextResponse.json(
                { error: 'graph_json must contain nodes[] and edges[] arrays' },
                { status: 400 }
            );
        }

        // Create graph (project_id is optional, can be null)
        const { data: graph, error } = await supabase
            .from('director_node_graphs')
            .insert({
                user_id: user.id,
                project_id: project_id || null,
                name,
                graph_json,
                version: 'v1'
            })
            .select()
            .single();

        if (error) {
            console.error('[Director Node] Error creating graph:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });

            // RLS policy violation
            if (error.code === '42501' || error.message.includes('policy')) {
                return NextResponse.json(
                    { error: 'Forbidden - RLS policy violation', details: error.message },
                    { status: 403 }
                );
            }

            // Foreign key violation (project_id doesn't exist)
            if (error.code === '23503') {
                return NextResponse.json(
                    { error: 'Invalid project_id - project does not exist', details: error.message },
                    { status: 400 }
                );
            }

            // Other validation errors
            if (error.code?.startsWith('23')) {
                return NextResponse.json(
                    { error: 'Validation error', details: error.message },
                    { status: 400 }
                );
            }

            // Generic error
            return NextResponse.json(
                { error: 'Failed to create graph', details: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            id: graph.id,
            message: 'Graph created successfully',
            graph
        });
    } catch (error: any) {
        console.error('[Director Node] POST /graphs error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/director-node/graphs
 * Update an existing graph
 * 
 * Body: {
 *   id: string,
 *   name?: string,
 *   graph_json?: { nodes: [], edges: [], viewport: {} }
 * }
 */
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, graph_json } = body;

        // Validation
        if (!id) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        if (!name && !graph_json) {
            return NextResponse.json(
                { error: 'At least one of name or graph_json must be provided' },
                { status: 400 }
            );
        }

        // Get current user with caching to prevent rate limit errors
        const supabase = await supabaseServer();
        const user = await getAuthenticatedUser(supabase);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Build update object
        const updates: any = {
            updated_at: new Date().toISOString()
        };
        if (name) updates.name = name;
        if (graph_json) updates.graph_json = graph_json;

        // Update graph (RLS will ensure user owns it)
        const { data: graph, error } = await supabase
            .from('director_node_graphs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Director Node] Error updating graph:', error);
            return NextResponse.json(
                { error: 'Failed to update graph' },
                { status: 500 }
            );
        }

        if (!graph) {
            return NextResponse.json(
                { error: 'Graph not found or unauthorized' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Graph updated successfully',
            graph
        });
    } catch (error: any) {
        console.error('[Director Node] PUT /graphs error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

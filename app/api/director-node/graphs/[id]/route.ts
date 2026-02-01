import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

/**
 * PUT /api/director-node/graphs/[id]
 * Update an existing graph
 */
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Auth check with caching to prevent rate limit errors
        const supabase = await supabaseServer();
        const user = await getAuthenticatedUser(supabase);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { name, graph_json } = body;

        // Update graph
        const { data, error } = await supabase
            .from('director_node_graphs')
            .update({
                name,
                graph_json,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', user.id) // Ensure user owns the graph
            .select()
            .single();

        if (error) {
            console.error('[Director Node] Error updating graph:', error);
            return NextResponse.json(
                { error: 'Failed to update graph', details: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ graph: data });
    } catch (error: any) {
        console.error('[Director Node] PUT /graphs/[id] error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/director-node/graphs/[id]
 * Delete a graph
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Auth check with caching to prevent rate limit errors
        const supabase = await supabaseServer();
        const user = await getAuthenticatedUser(supabase);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Delete graph
        const { error } = await supabase
            .from('director_node_graphs')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id); // Ensure user owns the graph

        if (error) {
            console.error('[Director Node] Error deleting graph:', error);
            return NextResponse.json(
                { error: 'Failed to delete graph', details: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Director Node] DELETE /graphs/[id] error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

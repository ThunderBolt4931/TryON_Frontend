import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { deleteFromCloudinary } from '@/lib/cloudinary';

const MODAL_API_URL = process.env.MODAL_API_URL || 'https://me240003014--tryon-inference-fastapi-app.modal.run/generate';

// Extend serverless function timeout for Vercel (default is 10s, Modal API can take 60+s)
export const maxDuration = 300;
export async function POST(request: NextRequest) {
    let subjectPublicId: string | null = null;
    let garmentPublicId: string | null = null;

    try {
        const { email, subjectUrl, garmentUrl, subjectPublicId: subId, garmentPublicId: garmId } = await request.json();

        subjectPublicId = subId || null;
        garmentPublicId = garmId || null;

        if (!email) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        if (!subjectUrl || !garmentUrl) {
            return NextResponse.json(
                { success: false, message: 'Please provide both Subject and Garment images' },
                { status: 400 }
            );
        }

        // Check quota and reset if needed
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (fetchError || !user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        const now = new Date();
        const lastReset = user.last_reset_time ? new Date(user.last_reset_time) : new Date(0);
        let count = user.generation_count || 0;

        // Check if 24 hours have passed since last reset
        if (now.getTime() - lastReset.getTime() > 24 * 60 * 60 * 1000) {
            // Reset count
            count = 0;
            // Update last_reset_time to now (we'll do this when incrementing count or just now)
            await supabase.from('users').update({ generation_count: 0, last_reset_time: now.toISOString() }).eq('email', email);
        }

        if (count >= 3) {
            return NextResponse.json(
                { success: false, message: 'Quota exceeded. You have used all 3 tries for today.' },
                { status: 403 }
            );
        }

        // Call Modal API
        const response = await fetch(MODAL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject_url: subjectUrl,
                garment_url: garmentUrl,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Modal API Error:', response.status, errorText);
            return NextResponse.json(
                { success: false, message: `Generation failed: ${response.status}` },
                { status: 500 }
            );
        }

        // Get image bytes and convert to base64
        const imageBuffer = await response.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        // Increment usage count and ensure last_reset_time is set if it was a fresh day
        // Actually, if we reset above, we already set last_reset_time.
        // If we didn't reset, we just increment.
        // Wait, if we reset, count became 0.
        // Now we did a generation, so count becomes 1.

        await supabase.from('users').update({ generation_count: count + 1 }).eq('email', email);

        const newRemaining = Math.max(0, 2 - count);

        return NextResponse.json({
            success: true,
            image: `data:image/png;base64,${base64Image}`,
            remaining: newRemaining,
        });
    } catch (error) {
        console.error('Generate Error:', error);
        return NextResponse.json(
            { success: false, message: `Connection Error: ${String(error)}` },
            { status: 500 }
        );
    } finally {
        // Cleanup uploaded images from Cloudinary
        try {
            if (subjectPublicId) {
                await deleteFromCloudinary(subjectPublicId);
            }
            if (garmentPublicId) {
                await deleteFromCloudinary(garmentPublicId);
            }
        } catch (cleanupError) {
            console.error('Cleanup Error:', cleanupError);
        }
    }
}

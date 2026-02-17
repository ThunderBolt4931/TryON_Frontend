import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateCode, sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const { email, name } = await request.json();

        if (!email || !name) {
            return NextResponse.json(
                { success: false, message: 'Email and name are required' },
                { status: 400 }
            );
        }

        // Generate 6-digit code
        const code = generateCode();

        // Send email
        const { success, message } = await sendVerificationEmail(email, code);
        if (!success) {
            return NextResponse.json({ success: false, message }, { status: 500 });
        }

        // Store/update user in database
        // First check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        let dbError;
        if (existingUser) {
            // Update existing user (don't touch generation_count or last_reset_time)
            const { error } = await supabase
                .from('users')
                .update({
                    name,
                    verification_code: code,
                    last_login: new Date().toISOString(),
                })
                .eq('email', email);
            dbError = error;
        } else {
            // Insert new user with default values
            const { error } = await supabase
                .from('users')
                .insert({
                    email,
                    name,
                    verification_code: code,
                    last_login: new Date().toISOString(),
                    generation_count: 0,
                    last_reset_time: new Date().toISOString(),
                });
            dbError = error;
        }

        if (dbError) {
            console.error('Supabase Error:', dbError);
            throw new Error(dbError.message);
        }

        return NextResponse.json({ success: true, message: 'Code sent!' });
    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}

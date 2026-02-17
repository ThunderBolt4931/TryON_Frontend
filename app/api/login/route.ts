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
        const { error } = await supabase
            .from('users')
            .upsert({
                email,
                name,
                verification_code: code,
                last_login: new Date().toISOString(),
            }, { onConflict: 'email' });

        if (error) {
            console.error('Supabase Error:', error);
            throw new Error(error.message);
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

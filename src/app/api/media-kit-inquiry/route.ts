import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, opportunityType, message } = body;

    // Validation
    if (!name || !email || !opportunityType || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Here you would typically:
    // 1. Save to database
    // 2. Send confirmation email
    // 3. Notify Sean
    // For now, just return success
    
    return NextResponse.json(
      { 
        success: true,
        message: 'Inquiry received. We will be in touch soon.',
        data: { name, email, opportunityType, receivedAt: new Date().toISOString() }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Media Kit inquiry error:', error);
    return NextResponse.json(
      { error: 'Failed to process inquiry' },
      { status: 500 }
    );
  }
}

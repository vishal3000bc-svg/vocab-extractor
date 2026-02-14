import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfParse from 'pdf-parse';
import { extractRawText } from 'mammoth';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

interface ExtractedData {
    text: string;
    metadata: {
        fileName: string;
        fileType: string;
        extractedAt: string;
    };
    success: boolean;
    error?: string;
}

const SUPPORTED_TYPES: { [key: string]: string } = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'image/png': 'image',
    'image/jpeg': 'image',
    'image/jpg': 'image',
    'image/webp': 'image',
    'text/plain': 'text',
};

async function extractFromPDF(buffer: Buffer): Promise<string> {
    try {
        const data = await pdfParse(buffer);
        return data.text || '';
    } catch (error) {
        throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
    try {
        const result = await extractRawText({ buffer });
        return result.value || '';
    } catch (error) {
        throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function extractFromImage(buffer: Buffer, mimeType: string): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const base64 = buffer.toString('base64');
        const response = await model.generateContent([
            {
                inlineData: {
                    data: base64,
                    mimeType: mimeType as 'image/png' | 'image/jpeg' | 'image/webp',
                },
            },
            {
                text: 'Extract all visible text from this image. Be thorough and accurate.',
            },
        ]);
        const textContent = response.content.parts[0];
        if (textContent.type === 'text') {
            return textContent.text;
        }
        throw new Error('No text content returned');
    } catch (error) {
        throw new Error(`Image extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function extractFromText(buffer: Buffer): Promise<string> {
    try {
        return buffer.toString('utf-8');
    } catch (error) {
        throw new Error(`Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function processFile(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const fileType = SUPPORTED_TYPES[mimeType];
    if (!fileType) {
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
    switch (fileType) {
        case 'pdf':
            return await extractFromPDF(buffer);
        case 'docx':
        case 'doc':
            return await extractFromDOCX(buffer);
        case 'image':
            return await extractFromImage(buffer, mimeType);
        case 'text':
            return await extractFromText(buffer);
        default:
            throw new Error(`Unknown file type: ${fileType}`);
    }
}

export async function POST(request: NextRequest): Promise<NextResponse<ExtractedData>> {
    try {
        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json(
                {
                    text: '',
                    metadata: {
                        fileName: '',
                        fileType: '',
                        extractedAt: new Date().toISOString(),
                    },
                    success: false,
                    error: 'Google API key not configured',
                },
                { status: 500 }
            );
        }
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json(
                {
                    text: '',
                    metadata: {
                        fileName: '',
                        fileType: '',
                        extractedAt: new Date().toISOString(),
                    },
                    success: false,
                    error: 'No file provided',
                },
                { status: 400 }
            );
        }
        const MAX_FILE_SIZE = 25 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    text: '',
                    metadata: {
                        fileName: file.name,
                        fileType: file.type,
                        extractedAt: new Date().toISOString(),
                    },
                    success: false,
                    error: 'File size exceeds 25MB limit',
                },
                { status: 400 }
            );
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const extractedText = await processFile(buffer, file.name, file.type);
        return NextResponse.json(
            {
                text: extractedText,
                metadata: {
                    fileName: file.name,
                    fileType: file.type,
                    extractedAt: new Date().toISOString(),
                },
                success: true,
            },
            { status: 200 }
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json(
            {
                text: '',
                metadata: {
                    fileName: '',
                    fileType: '',
                    extractedAt: new Date().toISOString(),
                },
                success: false,
                error: errorMessage,
            },
            { status: 500 }
        );
    }
}
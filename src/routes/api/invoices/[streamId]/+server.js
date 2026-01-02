import { json } from '@sveltejs/kit';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getAdminPb } from '$lib/auth/pbAdmin.server';

function formatDate(d) {
	try {
		return new Date(d).toISOString().slice(0, 10);
	} catch {
		return String(d || '');
	}
}

export async function GET({ params }) {
	try {
		const pb = await getAdminPb();
		const stream = await pb.collection('streams').getOne(params.streamId);
		const startMs = Date.parse(stream.startAt);
		const endMs = Date.parse(stream.endAt);
		const rate = Number(stream.rateLamportsPerSec ?? 0);
		const totalLamports = rate && startMs && endMs && endMs > startMs ? Math.floor(rate * ((endMs - startMs) / 1000)) : 0;

		const pdf = await PDFDocument.create();
		const page = pdf.addPage([612, 792]);
		const font = await pdf.embedFont(StandardFonts.Helvetica);
		const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

		const margin = 54;
		let y = 792 - margin;

		page.drawText('Voidstream', { x: margin, y, size: 20, font: bold, color: rgb(0.1, 0.1, 0.1) });
		y -= 28;
		page.drawText('Invoice (preview rebuild)', { x: margin, y, size: 12, font, color: rgb(0.2, 0.2, 0.2) });
		y -= 24;

		const invoiceNumber = `VS-${Date.now()}`;
		const lines = [
			['Invoice #', invoiceNumber],
			['Date', formatDate(Date.now())],
			['Stream ID', stream.id],
			['Payer', stream.payerWallet],
			['Receiver', stream.receiverWallet],
			['Status', stream.status],
			['Start', formatDate(stream.startAt)],
			['End', formatDate(stream.endAt)],
			['Rate (lamports/sec)', String(stream.rateLamportsPerSec ?? 0)],
			['Total (lamports)', String(totalLamports)]
		];

		for (const [k, v] of lines) {
			page.drawText(String(k), { x: margin, y, size: 10, font: bold, color: rgb(0.15, 0.15, 0.15) });
			page.drawText(String(v), { x: margin + 160, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
			y -= 16;
		}

		const bytes = await pdf.save();

		// Store a record (PB schema requires `pdf` file, so upload it as a real file)
		const form = new FormData();
		form.set('stream', stream.id);
		form.set('number', invoiceNumber);
		form.set('meta', JSON.stringify({ generatedAt: new Date().toISOString() }));
		form.set('pdf', new Blob([bytes], { type: 'application/pdf' }), `${invoiceNumber}.pdf`);
		await pb.collection('invoices').create(form);

		return new Response(bytes, {
			headers: {
				'content-type': 'application/pdf',
				'content-disposition': `inline; filename="${invoiceNumber}.pdf"`
			}
		});
	} catch (e) {
		return json(
			{
				message: e?.message ?? 'Failed to generate invoice.',
				details: e?.data ?? null
			},
			{ status: 500 }
		);
	}
}



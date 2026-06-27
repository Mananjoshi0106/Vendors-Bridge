from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import Quotation, RFQ
from .models import AuditLog # Make sure this is at the top of your file!

@csrf_exempt  # Allows us to test easily from a local HTML file
def submit_quotation(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # 1. Find or create a dummy RFQ just so the database doesn't crash during testing
            rfq, created = RFQ.objects.get_or_create(
                id=1, 
                defaults={'title': 'Demo RFQ', 'items': 'Demo', 'quantity': 1, 'deadline': '2026-12-31'}
            )
            
            # 2. Save the new quotation to the database
            new_quote = Quotation.objects.create(
                rfq=rfq,
                vendor_name=data.get('vendorName', 'Unknown Vendor'),
                amount=data.get('amount'),
                delivery_timeline=data.get('delivery'),
                notes=data.get('notes', '')
            )
            
            return JsonResponse({'success': True, 'message': 'Quote Saved!', 'id': new_quote.id})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'message': 'Only POST allowed'})

# Add this to the bottom of procurement/views.py


@csrf_exempt
def create_audit_log(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Create and permanently save the log
            AuditLog.objects.create(
                action=data.get('action'),
                category=data.get('category'),
                user=data.get('user')
            )
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'message': 'Only POST allowed'}, status=405)
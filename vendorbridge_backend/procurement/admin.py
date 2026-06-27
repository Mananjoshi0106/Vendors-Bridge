# from django.contrib import admin
# from .models import RFQ, Quotation

# # This tells Django to show these tables in the admin panel
# admin.site.register(RFQ)
# admin.site.register(Quotation)

from django.contrib import admin
from .models import RFQ, Quotation, AuditLog

admin.site.register(RFQ)
admin.site.register(Quotation)
admin.site.register(AuditLog)
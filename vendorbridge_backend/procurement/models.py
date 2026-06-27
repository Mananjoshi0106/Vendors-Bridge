from django.db import models

class RFQ(models.Model):
    title = models.CharField(max_length=255)
    items = models.TextField()
    quantity = models.IntegerField()
    deadline = models.DateField()
    status = models.CharField(max_length=50, default='Open')

    def __str__(self):
        return self.title

class Quotation(models.Model):
    # This links the Quotation directly to the RFQ
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE)
    vendor_name = models.CharField(max_length=255)
    amount = models.IntegerField()
    delivery_timeline = models.CharField(max_length=100)
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='Pending')

    def __str__(self):
        return f"{self.vendor_name} - ₹{self.amount}"
from django.utils import timezone

class AuditLog(models.Model):
    action = models.CharField(max_length=500)
    category = models.CharField(max_length=50) # e.g., 'RFQ', 'Approvals', 'Invoices', 'Vendors'
    user = models.CharField(max_length=100)
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.category} - {self.action}"

    # THE IMMUTABILITY LOCK
    def save(self, *args, **kwargs):
        if self.pk is not None:
            # If the primary key exists, it means someone is trying to edit an old log
            raise PermissionError("STOP: Audit logs are immutable and cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("STOP: Audit logs cannot be deleted under any circumstances.")
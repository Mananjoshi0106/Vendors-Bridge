# procurement/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('api/quotes/', views.submit_quotation, name='submit_quotation'),
    path('api/logs/', views.create_audit_log, name='create_audit_log'),
]
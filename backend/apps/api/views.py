from django.db import transaction
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
)
from rest_framework import generics, viewsets
from rest_framework.exceptions import PermissionDenied
from apps.institutions.models import Organization
from .access_views import ORGANIZATION_HEADER
from .audit import audit
from .permissions import (
    check_school,
    membership_for,
    require_admin,
    schools_for,
)
from . import serializers as s


class OrganizationsView(generics.ListAPIView):
    serializer_class = s.OrganizationSerializer

    def get_queryset(self):
        return Organization.objects.filter(
            memberships__user=self.request.user,
            memberships__is_active=True,
            is_active=True,
        ).order_by("id")


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
    create=extend_schema(parameters=[ORGANIZATION_HEADER]),
    update=extend_schema(parameters=[ORGANIZATION_HEADER]),
    partial_update=extend_schema(parameters=[ORGANIZATION_HEADER]),
    destroy=extend_schema(exclude=True),
)
class TenantViewSet(viewsets.ModelViewSet):
    lookup_value_converter = "uuid"

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method in {"POST", "PUT", "PATCH"} and not getattr(
            self, "swagger_fake_view", False
        ):
            context["membership"] = membership_for(self.request)
        return context


class SchoolViewSet(TenantViewSet):
    serializer_class = s.SchoolSerializer

    def get_queryset(self):
        m = membership_for(self.request)
        return schools_for(m)

    @transaction.atomic
    def perform_create(self, serializer):
        m = self.locked_configuration_actor()
        if not m.all_schools_access:
            raise PermissionDenied("Criar uma escola exige acesso institucional.")
        serializer.context["membership"] = m
        serializer.validate_code(serializer.validated_data["code"])
        school = serializer.save(organization=m.organization)
        audit("SCHOOL_CREATED", school, actor=m.user, organization=m.organization, school_id=school.pk)

    @transaction.atomic
    def perform_update(self, serializer):
        m = self.locked_configuration_actor()
        serializer.instance.refresh_from_db()
        check_school(m, serializer.instance)
        serializer.context["membership"] = m
        if "code" in serializer.validated_data:
            serializer.validate_code(serializer.validated_data["code"])
        school = serializer.save()
        audit("SCHOOL_UPDATED", school, actor=m.user, organization=m.organization, school_id=school.pk)

    def locked_configuration_actor(self):
        m = require_admin(self.request)
        Organization.objects.select_for_update().get(pk=m.organization_id)
        return require_admin(self.request)

    def perform_destroy(self, instance):
        raise PermissionDenied(
            "Desativação deve ser feita por atualização administrativa."
        )

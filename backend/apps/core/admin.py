from django.contrib import admin
from django.contrib.auth import get_permission_codename


class OperationsReadOnlyAdmin(admin.ModelAdmin):
    actions = None
    show_full_result_count = False

    def get_readonly_fields(self, request, obj=None):
        return self.get_fields(request, obj)

    def has_view_permission(self, request, obj=None):
        opts = self.opts
        return request.user.has_perm(
            f"{opts.app_label}.{get_permission_codename('view', opts)}"
        )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

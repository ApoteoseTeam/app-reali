from rest_framework.exceptions import APIException


ERRORS = {
    "AI_PERMISSION_DENIED": (403, "A informação está fora do escopo autorizado."),
    "AI_CONVERSATION_NOT_FOUND": (404, "Conversa não encontrada."),
    "AI_CONVERSATION_ARCHIVED": (409, "Reative a conversa para enviar mensagens."),
    "AI_CONVERSATION_BUSY": (409, "A conversa já tem uma resposta em andamento."),
    "AI_REQUEST_CONFLICT": (409, "O identificador já pertence a outra solicitação."),
    "AI_INVALID_MESSAGE": (400, "Revise a mensagem e os parâmetros da solicitação."),
    "AI_INVALID_ARGUMENTS": (400, "Revise o intervalo e os filtros da consulta."),
    "AI_RATE_LIMITED": (429, "O limite de uso do RealInova foi atingido."),
    "AI_COST_LIMIT": (429, "O limite de custo configurado foi atingido."),
    "AI_PROVIDER_UNAVAILABLE": (503, "O provedor do RealInova está indisponível."),
    "AI_PROVIDER_RATE_LIMITED": (503, "O provedor atingiu o limite de requisições."),
    "AI_PROVIDER_AUTH_FAILED": (503, "A integração do RealInova está indisponível."),
    "AI_PROVIDER_INVALID_RESPONSE": (502, "O RealInova recebeu uma resposta inválida."),
    "AI_TIMEOUT": (504, "O RealInova excedeu o tempo de resposta."),
    "AI_TOOL_ERROR": (503, "Não foi possível consultar os indicadores."),
    "AI_PERSISTENCE_ERROR": (503, "Não foi possível gravar a execução do RealInova."),
    "AI_DATA_UNAVAILABLE": (
        200,
        "Os dados desse indicador estão indisponíveis no período.",
    ),
}


class AIError(APIException):
    def __init__(self, code, *, retry_after=None):
        self.code = code
        self.status_code, self.description = ERRORS[code]
        self.wait = retry_after
        super().__init__(self.description, code=code)

# Validação de previsão

A previsão calcula entradas × taxa e arredonda para inteiro com `ROUND_HALF_UP`. Usa política configurada, override permitido ou amostras históricas elegíveis. O histórico respeita o corte temporal, o estado do serviço e a qualidade dos dados. Datas, amostras, método, versão e parâmetros ficam persistidos na previsão.

`apps/meals/test_meals.py` cobre janela, zero e ausência de evidência, taxas abaixo e acima de um, arredondamento, configuração alternativa, amostras insuficientes, outlier, ajustes conhecidos no corte e previsões concorrentes. Eventos após o preparo entram nas contagens e indicadores, preservando o snapshot original. Uma falha de cálculo reverte a transição e o snapshot.

O ensaio HTTP usou 25 entradas e taxa inicial 0,8. O Django devolveu snapshot de 25 e previsão de 20, persistindo um registro de cada. Essa amostra verifica contrato e reprodução do cálculo. [Motor de previsão](FORECAST_ENGINE.md)

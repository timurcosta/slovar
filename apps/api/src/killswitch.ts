// Аварийное выключение по бюджету. Триггер бюджета «Страховка» вызывает эту функцию на каждом пороге;
// если расходы за месяц дошли до суммы бюджета, функция удаляет API Gateway игры. Тогда запросы перестают
// приниматься и тарифицироваться, игра у детей работает офлайн, прогресс копится на устройствах.
// Включить обратно: npm run cloud:deploy (шлюз создастся заново, с новым адресом).
// Переменные: FOLDER_ID, GATEWAY_NAME.

interface BudgetMessage {
  budget_display_name?: string;
  amount: number;
  budgeted_amount: number;
  threshold_amount?: number;
  currency?: string;
}
interface Context {
  token?: { access_token: string };
}

const API = "https://serverless-apigateway.api.cloud.yandex.net/apigateways/v1/apigateways";

/** Выключать ли: расходы дошли до суммы бюджета (с запасом на округление). */
export const shouldStop = (m: BudgetMessage) => Number(m.amount) >= Number(m.budgeted_amount) * 0.99;

export async function handler(event: { messages?: BudgetMessage[] }, context: Context) {
  const messages = event.messages ?? [];
  const over = messages.find(shouldStop);
  if (!over) {
    console.log("Порог бюджета, но до выключения не дошло:", JSON.stringify(messages));
    return { stopped: false };
  }
  const { FOLDER_ID, GATEWAY_NAME } = process.env;
  const auth = { authorization: `Bearer ${context.token?.access_token}` };
  const list = await fetch(`${API}?folderId=${FOLDER_ID}`, { headers: auth }).then((r) => r.json());
  const gw = (list.apiGateways ?? []).find((g: { name: string }) => g.name === GATEWAY_NAME);
  if (!gw) {
    console.log(`Шлюза ${GATEWAY_NAME} уже нет`);
    return { stopped: true, already: true };
  }
  const res = await fetch(`${API}/${gw.id}`, { method: "DELETE", headers: auth });
  console.log(
    `Бюджет превышен (${over.amount} из ${over.budgeted_amount} ${over.currency ?? ""}), удаляю шлюз ${gw.id}: ${res.status}`,
  );
  if (!res.ok) throw new Error(`Не удалось удалить шлюз: ${res.status} ${await res.text()}`);
  return { stopped: true };
}

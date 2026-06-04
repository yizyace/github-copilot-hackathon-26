// Demo fixture for Pattern Pointers — intentionally contains architectural anti-patterns.

interface Order {
  id: string;
  customerEmail: string;
  items: { sku: string; qty: number; price: number }[];
  status: string;
}

// Hand-rolled singleton holding global mutable state.
class OrderRegistry {
  private static instance: OrderRegistry;
  public orders: Order[] = [];

  static getInstance(): OrderRegistry {
    if (!OrderRegistry.instance) {
      OrderRegistry.instance = new OrderRegistry();
    }
    return OrderRegistry.instance;
  }
}

// One class doing persistence + email + business logic + logging.
class OrderService {
  private db = new PostgresClient("postgres://prod/orders");
  private mailer = new SmtpMailer("smtp.internal:25");

  placeOrder(order: Order): void {
    // Business logic: total calc (duplicated below in refund()).
    let total = 0;
    for (const item of order.items) {
      total += item.price * item.qty;
    }

    order.status = "PLACED";
    OrderRegistry.getInstance().orders.push(order);

    // Persistence.
    this.db.query(`INSERT INTO orders VALUES ('${order.id}', ${total})`);

    // Email.
    this.mailer.send(order.customerEmail, "Order placed", `Total: ${total}`);

    // Logging.
    console.log(`[OrderService] placed ${order.id} total=${total}`);
  }

  refund(order: Order): void {
    // Duplicated total calculation logic.
    let total = 0;
    for (const item of order.items) {
      total += item.price * item.qty;
    }

    order.status = "REFUNDED";
    this.db.query(`UPDATE orders SET refunded=${total} WHERE id='${order.id}'`);
    this.mailer.send(order.customerEmail, "Order refunded", `Refund: ${total}`);
    console.log(`[OrderService] refunded ${order.id} total=${total}`);
  }
}

export { OrderService, OrderRegistry };

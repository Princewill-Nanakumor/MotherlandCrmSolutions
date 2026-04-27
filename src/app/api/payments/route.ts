// /Users/safeconnection/Downloads/drivecrm/src/app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { ObjectId } from "mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";

// Get wallet addresses from environment variables
const WALLET_ADDRESSES = {
  TRC20: process.env.TRC20_WALLET_ADDRESS,
  ERC20: process.env.ERC20_WALLET_ADDRESS,
};

const MAX_AMOUNT = parseFloat(process.env.MAX_PAYMENT_AMOUNT || "1000000");
const MAX_PAYMENTS_PER_HOUR = parseInt(
  process.env.MAX_PAYMENTS_PER_HOUR || "500"
);
const MAX_PAYMENTS_PER_DAY = parseInt(process.env.MAX_PAYMENTS_PER_DAY || "50");

const VALID_NETWORKS = ["TRC20", "ERC20"] as const;
const VALID_METHODS = ["CRYPTO"] as const;
const VALID_CURRENCIES = ["USD", "USDT"] as const;

// Define the request data interface
interface PaymentRequestData {
  amount: string | number;
  currency?: string;
  method: string;
  network: string;
  description?: string;
}

// Type guards for validation
function isValidNetwork(
  network: string
): network is (typeof VALID_NETWORKS)[number] {
  return VALID_NETWORKS.includes(network as (typeof VALID_NETWORKS)[number]);
}

function isValidMethod(
  method: string
): method is (typeof VALID_METHODS)[number] {
  return VALID_METHODS.includes(method as (typeof VALID_METHODS)[number]);
}

function isValidCurrency(
  currency: string
): currency is (typeof VALID_CURRENCIES)[number] {
  return VALID_CURRENCIES.includes(
    currency as (typeof VALID_CURRENCIES)[number]
  );
}

// Input validation function
function validatePaymentRequest(data: PaymentRequestData) {
  const errors: string[] = [];

  // Amount validation
  if (!data.amount || isNaN(Number(data.amount))) {
    errors.push("Amount is required and must be a valid number");
  } else {
    const amount = parseFloat(String(data.amount));
    if (amount > MAX_AMOUNT) {
      errors.push(`Maximum payment amount is ${MAX_AMOUNT} USDT`);
    }
    if (amount <= 0) {
      errors.push("Amount must be greater than 0");
    }
  }

  // Network validation
  if (!data.network || !isValidNetwork(data.network)) {
    errors.push("Valid network is required (TRC20 or ERC20)");
  }

  // Method validation
  if (!data.method || !isValidMethod(data.method)) {
    errors.push("Valid payment method is required");
  }

  // Currency validation
  if (data.currency && !isValidCurrency(data.currency)) {
    errors.push("Valid currency is required");
  }

  return errors;
}

// Rate limiting function
async function checkRateLimit(userId: string) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [hourlyCount, dailyCount] = await Promise.all([
    Payment.countDocuments({
      createdBy: userId,
      createdAt: { $gte: oneHourAgo },
    }),
    Payment.countDocuments({
      createdBy: userId,
      createdAt: { $gte: oneDayAgo },
    }),
  ]);

  if (hourlyCount >= MAX_PAYMENTS_PER_HOUR) {
    throw new Error(
      `Rate limit exceeded: Maximum ${MAX_PAYMENTS_PER_HOUR} payments per hour`
    );
  }

  if (dailyCount >= MAX_PAYMENTS_PER_DAY) {
    throw new Error(
      `Rate limit exceeded: Maximum ${MAX_PAYMENTS_PER_DAY} payments per day`
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse("Authentication required");
    }

    // Parse and validate request data
    const requestData: PaymentRequestData = await request.json();
    const validationErrors = validatePaymentRequest(requestData);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    // Database connection
    await connectMongoDB();

    // User validation
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Admin ID validation
    const scopedAdminId = await withAdminScope(session, async (adminId) => adminId);
    const adminId = new ObjectId(scopedAdminId);

    // Rate limiting check
    try {
      await checkRateLimit(session.user.id);
    } catch (rateLimitError) {
      return NextResponse.json(
        {
          error:
            rateLimitError instanceof Error
              ? rateLimitError.message
              : "Rate limit exceeded",
        },
        { status: 429 }
      );
    }

    // Wallet address validation
    const network = requestData.network as keyof typeof WALLET_ADDRESSES;
    const walletAddress = WALLET_ADDRESSES[network];

    if (!walletAddress) {
      console.error(`Missing wallet address for network: ${network}`);
      return NextResponse.json(
        { error: "Payment service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Generate transaction ID with additional entropy
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const transactionId = `TXN_${timestamp}_${random.toUpperCase()}`;

    // Create payment document
    const payment = new Payment({
      amount: parseFloat(String(requestData.amount)),
      currency: requestData.currency || "USD",
      status: "PENDING",
      method: requestData.method,
      transactionId: transactionId,
      description: requestData.description || `USDT deposit via ${network}`,
      adminId: adminId,
      createdBy: session.user.id,
      network: network,
      walletAddress: walletAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save payment
    const savedPayment = await payment.save();

    // Return success response
    const createdPayment = {
      ...savedPayment.toObject(),
      _id: savedPayment._id.toString(),
      id: savedPayment._id.toString(),
    };

    return NextResponse.json({
      success: true,
      payment: createdPayment,
      message: "Payment request created successfully",
    });
  } catch (error) {
    // Log error for debugging (but don't expose details to client)
    console.error("Payment creation error:", error);

    // Return generic error message in production
    const isProduction = process.env.NODE_ENV === "production";

    return NextResponse.json(
      {
        error: isProduction
          ? "Failed to create payment request. Please try again later."
          : error instanceof Error
            ? error.message
            : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse("Authentication required");
    }

    await connectMongoDB();
    const { searchParams } = new URL(request.url);

    // Validate pagination parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20"))
    );
    const skip = (page - 1) * limit;

    const scopedAdminId = await withAdminScope(session, async (adminId) => adminId);
    const query: { adminId?: ObjectId } = { adminId: new ObjectId(scopedAdminId) };

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ]);

    const processedPayments = payments.map((payment) => ({
      ...payment,
      _id: String(payment._id),
      id: String(payment._id),
    }));

    return NextResponse.json({
      success: true,
      payments: processedPayments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching payments:", error);

    const isProduction = process.env.NODE_ENV === "production";

    return NextResponse.json(
      {
        error: isProduction
          ? "Failed to fetch payments. Please try again later."
          : error instanceof Error
            ? error.message
            : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

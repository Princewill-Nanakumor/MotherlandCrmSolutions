import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { PasswordUpdateSchema } from "@/schemas";
import { unauthorizedResponse } from "@/lib/apiResponses";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const parse = PasswordUpdateSchema.safeParse(body);

    if (!parse.success) {
      // Return all field errors
      const errors: Record<string, string> = {};
      parse.error.errors.forEach((err) => {
        if (err.path && err.path[0]) {
          errors[err.path[0]] = err.message;
        }
      });
      return NextResponse.json({ errors }, { status: 400 });
    }

    const { currentPassword, newPassword } = parse.data;

    await connectMongoDB();

    const user = await User.findOne({ email: session.user.email });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "User not found or password not set" },
        { status: 404 }
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      // Field-level error for currentPassword
      return NextResponse.json(
        { errors: { currentPassword: "Current password is incorrect" } },
        { status: 400 }
      );
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      // Field-level error for newPassword
      return NextResponse.json(
        {
          errors: {
            newPassword:
              "New password must be different from the current password",
          },
        },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    return NextResponse.json({ message: "Password updated successfully" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

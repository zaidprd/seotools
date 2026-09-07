import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/require-auth";

const ARTICLE_FIELDS = "id, title, keyword, content, content_html, slug, meta_description, featured_preset, created_at, updated_at";
const MAX_TEXT_LENGTH = 1_000_000;

type ArticleUpdate = {
  title?: string;
  content?: string;
  content_html?: string | null;
  slug?: string | null;
  meta_description?: string | null;
  featured_preset?: Record<string, unknown> | null;
};

function invalidField(value: unknown, maxLength = 500): boolean {
  return typeof value !== "string" || value.length > maxLength;
}

function parseUpdate(payload: unknown): ArticleUpdate | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const body = payload as Record<string, unknown>;
  const update: ArticleUpdate = {};
  const allowed = ["title", "content", "content_html", "slug", "meta_description", "featured_preset"];
  if (Object.keys(body).some((key) => !allowed.includes(key))) return null;

  if ("title" in body) {
    if (invalidField(body.title)) return null;
    update.title = body.title as string;
  }
  if ("content" in body) {
    if (invalidField(body.content, MAX_TEXT_LENGTH)) return null;
    update.content = body.content as string;
  }
  if ("content_html" in body) {
    if (body.content_html !== null && invalidField(body.content_html, MAX_TEXT_LENGTH)) return null;
    update.content_html = body.content_html as string | null;
  }
  if ("slug" in body) {
    if (body.slug !== null && (invalidField(body.slug, 240) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug as string))) return null;
    update.slug = body.slug as string | null;
  }
  if ("meta_description" in body) {
    if (body.meta_description !== null && invalidField(body.meta_description, 500)) return null;
    update.meta_description = body.meta_description as string | null;
  }
  if ("featured_preset" in body) {
    if (body.featured_preset !== null && (typeof body.featured_preset !== "object" || Array.isArray(body.featured_preset))) return null;
    update.featured_preset = body.featured_preset as Record<string, unknown> | null;
  }

  return Object.keys(update).length ? update : null;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_FIELDS)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Artikel tidak dapat dimuat" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const update = parseUpdate(payload);
  if (!update) return NextResponse.json({ error: "Perubahan artikel tidak valid" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .update(update)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select(ARTICLE_FIELDS)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Artikel tidak dapat disimpan" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
  return NextResponse.json(data);
}

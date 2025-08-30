export interface Article {
    article_id: string;
    title: string;
    url: string;
    source: string;
    category: string;
    subcategory: string;
    rating: number;
    rated_at: string;
    keywords: string[];
    summary: string;
    embedding: string;
    embedding_model: string;
    semantic_keywords: string[];
    created_at: string;
}
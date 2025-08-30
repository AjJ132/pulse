import { DynamoDBService, DynamoScanParams, DynamoServiceConfig } from "../services/DynamoService";
import { Article } from "../types/article";
import { logger } from '../utils/Logger';

interface NewsControllerServiceConfig {
    awsRegion: string;
}

export class NewsController {

    private dynamoService: DynamoDBService;

    constructor(config: NewsControllerServiceConfig) {
        const dynamoConfig: DynamoServiceConfig = {
            region: config.awsRegion,
        };
        this.dynamoService = new DynamoDBService(dynamoConfig);
    }

    public async getDailyNews(): Promise<any> {
        // get table from env
        const articleTableName = process.env.PULSE_NEWS_ARTICLES_TABLE_NAME
        if (!articleTableName) {
            logger.error("Missing environment variable: PULSE_NEWS_ARTICLES_TABLE_NAME", {}, "NewsController");
            throw new Error("Missing environment variable: PULSE_NEWS_ARTICLES_TABLE_NAME");
        }
        //fetch articles
        const articles = await this.fetchRandomArticles(articleTableName);

        logger.info("Found articles:", articles);

        //generate queries based on sentiment analysis
        const queries = await this.generateQueries(articles);

        //fetch news articles based on generated queries
        const articles = await

        //store in database

        //Send push notification
    }

    private async fetchRandomArticles(articleTableName: string): Promise<any[]> {
        const params: DynamoScanParams = {
            TableName: articleTableName,
            Limit: 5,
            FilterExpression: 'attribute_exists(title)',
        };
        const result = await this.dynamoService.scan(params);
        return result.Items || [];
    }

    private async generateQueries(articles: Article[]): Promise<string[]> {
        try {
            logger.info(`Analyzing ${articles.length} articles for query generation`, {}, "NewsController");

            // Step 1: Filter to highly rated articles (4+ stars)
            const highRatedArticles = articles.filter(article => article.rating >= 4);

            if (highRatedArticles.length === 0) {
                logger.warn("No highly rated articles found, using fallback queries", {}, "NewsController");
                return this.getFallbackQueries();
            }

            // Step 2: Group articles by category and analyze preferences
            const categoryStats: {
                [key: string]: {
                    count: number,
                    avgRating: number,
                    keywords: Set<string>,
                    subcategories: Set<string>
                }
            } = {};

            highRatedArticles.forEach(article => {
                const category = article.category;
                if (!categoryStats[category]) {
                    categoryStats[category] = {
                        count: 0,
                        avgRating: 0,
                        keywords: new Set(),
                        subcategories: new Set()
                    };
                }

                categoryStats[category].count++;
                categoryStats[category].avgRating =
                    (categoryStats[category].avgRating * (categoryStats[category].count - 1) + article.rating) / categoryStats[category].count;

                // Add keywords and semantic keywords
                [...article.keywords, ...article.semantic_keywords].forEach(keyword => {
                    categoryStats[category].keywords.add(keyword.toLowerCase());
                });

                if (article.subcategory) {
                    categoryStats[category].subcategories.add(article.subcategory);
                }
            });

            // Step 3: Generate queries based on top categories
            const queries: string[] = [];
            const currentYear = new Date().getFullYear();

            // Sort categories by preference (avg rating * count)
            const sortedCategories = Object.entries(categoryStats)
                .map(([category, stats]) => ({
                    category,
                    priority: stats.avgRating * stats.count,
                    ...stats
                }))
                .sort((a, b) => b.priority - a.priority);

            logger.info("Category preferences:", sortedCategories, "NewsController");

            // Generate 2-3 queries per top category
            for (const categoryData of sortedCategories.slice(0, 4)) { // Top 4 categories
                const { category, keywords, subcategories } = categoryData;
                const keywordArray = Array.from(keywords);
                const subcategoryArray = Array.from(subcategories);

                if (category === 'science') {
                    queries.push(
                        `${keywordArray.slice(0, 3).join(' ')} breakthrough ${currentYear}`,
                        `latest ${keywordArray[0]} research clinical trials`,
                        subcategoryArray.length > 0
                            ? `${subcategoryArray[0]} ${keywordArray[1]} innovation news`
                            : `medical research ${keywordArray.slice(0, 2).join(' ')}`
                    );
                }
                else if (category === 'technology' || category === 'tech') {
                    queries.push(
                        `${keywordArray.slice(0, 2).join(' ')} ${currentYear} announcement`,
                        `tech company ${keywordArray[0]} earnings results`,
                        subcategoryArray.length > 0
                            ? `${subcategoryArray[0]} ${keywordArray[1]} launch`
                            : `startup ${keywordArray.slice(0, 2).join(' ')} funding`
                    );
                }
                else if (category === 'politics') {
                    // Check subcategory for political lean
                    if (subcategoryArray.includes('republican') || keywordArray.some(k => ['republican', 'gop', 'conservative'].includes(k))) {
                        queries.push(
                            `Republican ${keywordArray.filter(k => !['republican', 'gop'].includes(k)).slice(0, 2).join(' ')} policy`,
                            `conservative ${keywordArray[0]} legislation ${currentYear}`,
                            `GOP ${keywordArray.slice(0, 2).join(' ')} announcement`
                        );
                    } else {
                        // Generic political queries for other subcategories
                        queries.push(`${keywordArray.slice(0, 3).join(' ')} policy ${currentYear}`);
                    }
                }
                else if (category === 'sports') {
                    // Check for Georgia Bulldogs specifically
                    if (keywordArray.some(k => ['georgia', 'bulldogs', 'uga'].includes(k))) {
                        queries.push(
                            'Georgia Bulldogs football news',
                            'UGA sports SEC conference',
                            'Georgia Bulldogs recruiting update'
                        );
                    } else if (subcategoryArray.length > 0) {
                        queries.push(
                            `${subcategoryArray[0]} ${keywordArray.slice(0, 2).join(' ')} championship`,
                            `${keywordArray[0]} ${subcategoryArray[0]} playoff`
                        );
                    } else {
                        queries.push(`${keywordArray.slice(0, 2).join(' ')} sports news`);
                    }
                }
                else {
                    // Generic category queries
                    queries.push(
                        `${keywordArray.slice(0, 3).join(' ')} ${currentYear}`,
                        `latest ${category} ${keywordArray[0]} news`
                    );
                }
            }

            // Step 4: Add some trending/recent queries
            queries.push(
                `breaking news ${currentYear}`,
                'trending technology breakthrough',
                'latest scientific discovery'
            );

            // Remove duplicates and limit to reasonable number
            const uniqueQueries = [...new Set(queries)]
                .filter(query => query.length > 5) // Remove very short queries
                .slice(0, 12); // Limit to 12 queries max

            logger.info(`Generated ${uniqueQueries.length} search queries:`, uniqueQueries, "NewsController");

            return uniqueQueries;

        } catch (error) {
            logger.error("Error generating queries:", error as Error, "NewsController");
            return this.getFallbackQueries();
        }
    }

    private async fetchNewsFromQueries(queries: string[]): Promise<Article[]> {
        const articles = await Promise.all(queries.map(query => this.fetchNews(query)));
        return articles.flat();
    }

    private getFallbackQueries(): string[] {
        const currentYear = new Date().getFullYear();
        return [
            `science breakthrough ${currentYear}`,
            'technology innovation news',
            'Republican policy update',
            'Georgia Bulldogs football',
            'medical research clinical trial',
            'Apple Google Microsoft earnings',
            'conservative fiscal policy',
            'biotech gene therapy',
            'AI machine learning development',
            'startup funding announcement'
        ];
    }

}
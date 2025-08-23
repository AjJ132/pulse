import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

// Test news articles data
const testNewsArticles = [
  {
    id: '1',
    title: 'Breaking: Major Tech Breakthrough in AI Research',
    content: 'Scientists have announced a revolutionary breakthrough in artificial intelligence that could transform how we interact with technology. The new algorithm shows unprecedented accuracy in natural language processing.',
    author: 'Dr. Sarah Chen',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    category: 'Technology',
    readTime: '5 min read'
  },
  {
    id: '2',
    title: 'Global Markets React to New Economic Policy',
    content: 'Financial markets worldwide are responding to the latest economic policy announcement. Analysts predict this could lead to significant changes in investment strategies across multiple sectors.',
    author: 'Michael Rodriguez',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    category: 'Business',
    readTime: '3 min read'
  },
  {
    id: '3',
    title: 'Climate Summit Reaches Historic Agreement',
    content: 'World leaders have reached a landmark agreement on climate change at the annual summit. The new commitments aim to reduce carbon emissions by 50% by 2030.',
    author: 'Emma Thompson',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    category: 'Environment',
    readTime: '7 min read'
  },
  {
    id: '4',
    title: 'SpaceX Successfully Launches New Satellite Constellation',
    content: 'SpaceX has successfully deployed another batch of satellites into orbit, bringing the total constellation to over 4,000 satellites. This expansion will improve global internet coverage.',
    author: 'Alex Johnson',
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    category: 'Science',
    readTime: '4 min read'
  },
  {
    id: '5',
    title: 'Healthcare Innovation: New Treatment Shows Promise',
    content: 'Clinical trials for a new treatment have shown remarkable results in treating chronic conditions. The breakthrough could benefit millions of patients worldwide.',
    author: 'Dr. Lisa Park',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    category: 'Health',
    readTime: '6 min read'
  },
  {
    id: '6',
    title: 'Sports: Underdog Team Makes Historic Victory',
    content: 'In an unexpected turn of events, the underdog team has secured a historic victory against the reigning champions. Fans are calling this the greatest upset in recent sports history.',
    author: 'Tom Wilson',
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    category: 'Sports',
    readTime: '3 min read'
  },
  {
    id: '7',
    title: 'Entertainment Industry Faces Digital Transformation',
    content: 'The entertainment industry is undergoing a massive digital transformation. Streaming platforms are reshaping how content is produced and consumed globally.',
    author: 'Rachel Green',
    publishedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), // 1.5 days ago
    category: 'Entertainment',
    readTime: '5 min read'
  },
  {
    id: '8',
    title: 'Education Reform: New Learning Methods Show Success',
    content: 'Innovative teaching methods are showing remarkable success in improving student outcomes. Schools across the country are adopting these new approaches.',
    author: 'Professor David Brown',
    publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
    category: 'Education',
    readTime: '4 min read'
  }
];

export const newsHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
    // Randomly select 3-6 articles to return
    const numArticles = Math.floor(Math.random() * 4) + 3; // Random number between 3-6
    const shuffledArticles = [...testNewsArticles].sort(() => Math.random() - 0.5);
    const selectedArticles = shuffledArticles.slice(0, numArticles);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({
        message: 'News handler response',
        data: {
          articles: selectedArticles,
          totalCount: testNewsArticles.length,
          returnedCount: selectedArticles.length
        }
      })
    }
}
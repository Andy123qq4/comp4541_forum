import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const HomePage = ({ contract, account }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load all posts when the component mounts or when contract changes
  useEffect(() => {
    const loadPosts = async () => {
      if (!contract) return;
      
      try {
        setLoading(true);
        
        // Get the total number of posts
        const postCount = Number(await contract.postCount());
        const postsArray = [];
        
        // Load each post
        for (let i = postCount; i >= 1; i--) {
          const post = await contract.getPost(i);
          
          // Format post data
          const formattedPost = {
            id: i,
            author: post[0],
            content: post[1],
            tag: post[2],
            timestamp: new Date(Number(post[3]) * 1000).toLocaleString(),
            isTagChallenged: post[4],
            realVotes: Number(post[5]),
            fakerVotes: Number(post[6]),
            commentCount: Number(post[7])
          };
          
          postsArray.push(formattedPost);
        }
        
        setPosts(postsArray);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPosts();
    
    // Listen for new posts
    const handleNewPost = (postId, author, tag, content) => {
      loadPosts(); // Reload all posts when a new one is created
    };
    
    // Set up event listeners
    if (contract) {
      contract.on('PostCreated', handleNewPost);
      
      // Cleanup function
      return () => {
        contract.off('PostCreated', handleNewPost);
      };
    }
  }, [contract]);
  
  // Truncate Ethereum address for display
  const truncateAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Generate anonymous identifier based on address and tag
  const getAnonymousId = (address, tag) => {
    // Use first 2 characters of address to create a unique but consistent ID
    const id = address.slice(2, 4);
    return `Anonymous ${tag.charAt(0).toUpperCase() + tag.slice(1)} #${id}`;
  };

  return (
    <div className="home-page">
      <h1>Recent Posts</h1>

      <div className="community-guidelines">
        <h2>Welcome to the Forum!</h2>
        <p>
          Your identity here is anonymous. We generate a unique ID for you 
          (e.g., "Anonymous Student #AB") using your chosen tag and the first 
          two characters of your Ethereum address after '0x'. This helps maintain 
          consistency while preserving privacy.
        </p>
        <p>
          Tags (Student, Professor, Staff) represent your role for a post or comment. 
          Help keep our community authentic by voting on tags!
        </p>
        <p>Please contribute respectfully and constructively.</p>
      </div>
      
      {loading ? (
        <div className="loading">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="no-posts">
          <p>No posts yet. Be the first to post!</p>
          <Link to="/create" className="create-post-btn">Create Post</Link>
        </div>
      ) : (
        <div className="posts-container">
          {posts.map((post) => {
            // Determine tag display style and suffix based on votes
            let tagStyle = {};
            let tagTextSuffix = "";
            if (post.fakerVotes > post.realVotes) {
              tagStyle.color = 'red';
              tagTextSuffix = " (Disputed)";
            } else if (post.realVotes > post.fakerVotes) {
              tagStyle.color = 'green';
              // No suffix for green
            } else if (post.realVotes === post.fakerVotes && post.realVotes > 0) {
              tagStyle.color = 'orange';
              tagTextSuffix = " (Cautious)";
            }
            // Else, default style for no votes

            return (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div className="post-author">
                    Posted by: {getAnonymousId(post.author, post.tag)}
                </div>
                <div className="post-tag" 
                    style={tagStyle} // Apply dynamic style
                >
                    #{post.tag}{tagTextSuffix} {/* Apply suffix */}
                </div>
              </div>
              
              <div className="post-timestamp">{post.timestamp}</div>
              
              <div className="post-content">
                  <p>{post.content}</p>
              </div>
              
              <div className="post-footer">
                <div className="post-id-display">Post #{post.id}</div>
                {post.isTagChallenged && (
                  <div className="votes-info">
                    <span className="real-votes">Real: {post.realVotes}</span>
                    <span className="faker-votes">Fake: {post.fakerVotes}</span>
                  </div>
                )}
                  <div className="post-comments-count">
                    {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
                  </div>
                <Link to={`/post/${post.id}`} className="view-post-btn">
                  View Details
                </Link>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HomePage; 
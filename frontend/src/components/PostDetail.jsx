import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

const PostDetail = ({ contract, account, provider }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentTag, setCommentTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Available tags that users can select
  const availableTags = ['student', 'professor', 'staff'];
  
  // Function to load comments - defined outside useEffect so it can be called from other functions
  const loadComments = async (commentCount) => {
    try {
      setLoadingComments(true);
      
      console.log(`Loading comments for post #${id} - Comment count: ${commentCount}`);
      
      if (commentCount === 0) {
        setComments([]);
        return;
      }
      
      // Check if contract has getComment function
      if (!contract.interface.getFunction("getComment")) {
        console.error("getComment function not found in contract interface");
        setError("Contract interface error: getComment function not found");
        return;
      }
      
      // First try individual comment loading which works more reliably
      // This simpler approach avoids issues with batch loading
      const commentsArray = [];
      
      for (let i = 1; i <= Math.min(commentCount, 20); i++) {
        try {
          // Always use Number for IDs when calling contract functions
          const postId = Number(id);
          console.log(`Fetching comment #${i} for post #${postId} with types:`, 
            typeof postId, typeof i);
          
          const comment = await contract.getComment(postId, i);
          console.log(`Post #${id}, Comment #${i}:`, comment);
          
          // The updated ABI should now provide tag as a string in index 2
          // And timestamp at index 3
          const formattedComment = {
            id: i,
            author: comment[0],
            content: comment[1],
            tag: comment[2],
            timestamp: new Date(Number(comment[3]) * 1000).toLocaleString()
          };
          
          console.log(`Formatted comment #${i}:`, formattedComment);
          commentsArray.push(formattedComment);
        } catch (err) {
          console.error(`Error loading comment #${i}:`, err);
          if (i === 1) {
            // If we can't even load the first comment, there might be a deeper issue
            setError(`Error loading comments: ${err.message}`);
            break;
          }
          // For other comments, just break the loop but don't show error if we got at least one comment
          break;
        }
      }
      
      if (commentsArray.length > 0) {
        console.log(`Successfully loaded ${commentsArray.length} comments`);
        setComments(commentsArray);
        return;
      }
      
      // If no comments were loaded but we should have some, show error state
      if (commentCount > 0 && commentsArray.length === 0) {
        console.error(`Failed to load any comments for post #${id}`);
      }
      
      setComments([]);
    } catch (error) {
      console.error('Error in comment loading function:', error);
      setError(`Comment loading error: ${error.message}`);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };
  
  // Load post data
  useEffect(() => {
    const loadPost = async () => {
      if (!contract) return;
      
      try {
        setLoading(true);
        
        // Get post data
        const postData = await contract.getPost(id);
        
        // Format post data
        const formattedPost = {
          id: Number(id),
          author: postData[0],
          content: postData[1],
          tag: postData[2],
          timestamp: new Date(Number(postData[3]) * 1000).toLocaleString(),
          isTagChallenged: postData[4],
          realVotes: Number(postData[5]),
          fakerVotes: Number(postData[6]),
          commentCount: Number(postData[7])
        };
        
        setPost(formattedPost);
        
        // Check if the current user has voted
        if (account) {
          const voted = await contract.hasVoted(id, account);
          setHasVoted(voted);
        }
        
        // Load comments
        await loadComments(formattedPost.commentCount);
        
      } catch (error) {
        console.error('Error loading post:', error);
        setError('Failed to load post data');
      } finally {
        setLoading(false);
      }
    };
    
    loadPost();
    
    // Set up event listeners
    if (contract) {
      try {
      const filterTagChallenged = contract.filters.TagChallenged(id);
      const filterVoteCast = contract.filters.VoteCast(id);
        const filterCommentAdded = contract.filters.CommentAdded(id);
      
      const handleTagChallenged = () => loadPost();
      const handleVoteCast = () => loadPost();
        const handleCommentAdded = () => loadPost();
      
      contract.on(filterTagChallenged, handleTagChallenged);
      contract.on(filterVoteCast, handleVoteCast);
        contract.on(filterCommentAdded, handleCommentAdded);
      
      // Cleanup function
      return () => {
        contract.off(filterTagChallenged, handleTagChallenged);
        contract.off(filterVoteCast, handleVoteCast);
          contract.off(filterCommentAdded, handleCommentAdded);
      };
      } catch (error) {
        console.error("Error setting up event listeners:", error);
      }
    }
  }, [contract, id, account]);
  
  // Add a comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    
    if (!commentTag) {
      setError('Please select a tag');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Ensure parameters are in the correct format
      const postId = Number(id); // Convert to number
      
      // Updated ABI now correctly expects 3 parameters
      console.log(`Adding comment to post ${postId} with tag "${commentTag}" and content: "${newComment}"`);
      
      // Send all 3 parameters as expected by the contract
      const tx = await contract.addComment(
        postId,         // Post ID as a number
        newComment,     // Content string
        commentTag      // Tag as separate parameter
      );
      
      console.log("Transaction sent:", tx);
      
      // Wait for the transaction to be mined
      console.log("Waiting for transaction to be mined...");
      const receipt = await tx.wait();
      console.log("Transaction mined:", receipt);
      
      // Clear the comment form
      setNewComment('');
      setCommentTag('');
      
      // Refresh post data and comments
      console.log("Refreshing post data...");
      const postData = await contract.getPost(postId);
      
      // In ethers.js v5, array-like objects are returned
      // We need to ensure we're accessing the correct indices
      if (postData && postData.length >= 8) {
        const commentCount = Number(postData[7]);
        
        setPost(prev => ({
          ...prev,
          commentCount
        }));
        
        // Load comments using the function defined above
        console.log("Refreshing comments with count:", commentCount);
        await loadComments(commentCount);
      } else {
        console.error("Invalid post data received:", postData);
        setError("Could not refresh post data. Please try again.");
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      
      if (error.message && error.message.includes('banned from using this tag')) {
        setError('You cannot use this tag');
      } else {
        setError(`Failed to add comment: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Vote function - now the primary way to interact with tags
  const handleVote = async (isRealVote) => {
    if (!account || !contract) { // Added !contract check
      setError('Please connect your wallet and ensure contract is loaded');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Call the new voteOnTag function from the contract
      const tx = await contract.voteOnTag(id, isRealVote);
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      // Update UI
      setHasVoted(true);
      
      // Refresh post data - this will update isTagChallenged, realVotes, fakerVotes
      const postData = await contract.getPost(id);
      setPost({
        id: Number(id), // ensure all fields are fresh
        author: postData[0],
        content: postData[1],
        tag: postData[2],
        timestamp: new Date(Number(postData[3]) * 1000).toLocaleString(),
        isTagChallenged: postData[4],
        realVotes: Number(postData[5]),
        fakerVotes: Number(postData[6]),
        commentCount: Number(postData[7])
      });
    } catch (error) {
      console.error('Error voting on tag:', error); // Changed error message slightly
      
      if (error.message.includes("Already voted")) {
        setError('You have already voted on this post.');
      } else if (error.message.includes("Cannot vote on your own post")) {
        setError('You cannot vote on your own post.');
      } else {
        setError('Failed to vote on tag. Please try again.'); // Changed error message slightly
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Truncate Ethereum address for display
  const truncateAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Generate anonymous identifier based on address and tag
  const getAnonymousId = (address, tag) => {
    // Use the provided tag or default to "unknown" if missing
    const displayTag = tag || "unknown";
    
    // Use first 2 characters of address to create a unique but consistent ID
    const id = address.slice(2, 4);
    return `Anonymous ${displayTag.charAt(0).toUpperCase() + displayTag.slice(1)} #${id}`;
  };
  
  // Get anonymous comment author
  const getCommentAuthorId = (comment) => {
    // Check if comment author is the post author
    if (post && comment.author.toLowerCase() === post.author.toLowerCase()) {
      return `${getAnonymousId(comment.author, comment.tag)} (Original Poster)`;
    }
    return getAnonymousId(comment.author, comment.tag);
  };
  
  if (loading) {
    return <div className="loading">Loading post...</div>;
  }
  
  if (!post) {
    return (
      <div className="post-not-found">
        <h1>Post Not Found</h1>
        <p>The post you're looking for doesn't exist.</p>
        <Link to="/" className="back-btn">Back to Home</Link>
      </div>
    );
  }

  // Additional guard before accessing post properties for styling
  if (!post) {
    console.error("PostDetail: 'post' is null unexpectedly right before tag styling logic.");
    return <div className="error-message">Error displaying post details. Post data became unavailable.</div>;
  }

  // Determine tag display style and suffix based on votes
  let tagStyle = {};
  let tagTextSuffix = "";
  if (post.fakerVotes > post.realVotes) {
    tagStyle.color = 'red';
    tagTextSuffix = " (Disputed)";
  } else if (post.realVotes > post.fakerVotes) {
    tagStyle.color = 'green';
    // tagTextSuffix = " (Verified)"; // No suffix needed as per user
  } else if (post.realVotes === post.fakerVotes && post.realVotes > 0) {
    tagStyle.color = 'orange';
    tagTextSuffix = " (Cautious)";
  }
  // Else, default style (no color change, no suffix) for no votes
  
  return (
    <div className="post-detail">
      <div className="back-link">
        <Link to="/">&larr; Back to Posts</Link>
      </div>
      
      <div className="post-card detail">
        <div className="post-header">
          <h1>Post #{post.id}</h1>
          <div className="post-author">
            Posted by: {getAnonymousId(post.author, post.tag)}
          </div>
          <div className="post-tag" 
            style={tagStyle} // Apply dynamic style
          >
            #{post.tag}{tagTextSuffix} {/* Apply suffix */}
          </div>
          <div className="post-timestamp">{post.timestamp}</div>
        </div>
        
        <div className="post-content">
          <p>{post.content}</p>
        </div>
        
        <div className="post-actions">
          {/* Voting UI: Show if user is connected, not the author, and hasn't voted */} 
          {account && post.author.toLowerCase() !== account.toLowerCase() && !hasVoted && (
            <div className="vote-actions">
              <h3>Vote on Tag Authenticity:</h3>
              <div className="vote-buttons">
                <button 
                  className="vote-real-btn"
                  onClick={() => handleVote(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Voting...' : 'Real Tag'}
                </button>
                <button 
                  className="vote-fake-btn"
                  onClick={() => handleVote(false)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Voting...' : 'Fake Tag'}
                </button>
              </div>
            </div>
          )}
          
          {/* Message if user has already voted */} 
          {account && hasVoted && (
            <div className="already-voted">
              You have already voted on this tag.
            </div>
          )}

          {/* Message if user is the author (cannot vote) - optional, as contract prevents it too */}
          {account && post.author.toLowerCase() === account.toLowerCase() && (
             <div className="own-post-vote-message">
               You cannot vote on the tag of your own post.
            </div>
          )}
          
          {/* Display votes summary if the tag has been challenged (i.e., has votes) */} 
          {post.isTagChallenged && (
            <div className="votes-summary">
              <h3>Current Votes:</h3>
              <div className="votes-display">
                <div className="real-votes">Real: {post.realVotes}</div>
                <div className="faker-votes">Fake: {post.fakerVotes}</div>
              </div>
            </div>
          )}
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="post-comments">
          <h3>Comments ({post.commentCount})</h3>
          
          <div className="comment-form">
            <form onSubmit={handleAddComment}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                disabled={!account || isSubmitting}
                required
              />
              
              <div className="form-group">
                <select
                  value={commentTag}
                  onChange={(e) => setCommentTag(e.target.value)}
                  disabled={!account || isSubmitting}
                  required
                  className="comment-tag-select"
                >
                  <option value="">-- Select Your Tag --</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </option>
                  ))}
                </select>
                
                <button 
                  type="submit" 
                  disabled={!account || isSubmitting || !commentTag}
                >
                  {isSubmitting ? 'Submitting...' : 'Add Comment'}
                </button>
              </div>
            </form>
          </div>
          
          <div className="comments-list">
            {loadingComments ? (
              <div className="loading">Loading comments...</div>
            ) : comments.length === 0 && post.commentCount > 0 ? (
              <div className="loading-error">
                <p>Comments failed to load. There are {post.commentCount} comments on this post.</p>
                <p>This could be due to a network issue or contract communication problem.</p>
                <button 
                  onClick={() => loadComments(post.commentCount)}
                  className="retry-btn"
                >
                  Retry Loading Comments
                </button>
              </div>
            ) : comments.length === 0 ? (
              <div className="no-comments">No comments yet. Be the first to comment!</div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-header">
                    <div className="comment-author">
                      {getCommentAuthorId(comment)}
                    </div>
                    <div className="comment-timestamp">
                      {comment.timestamp}
                    </div>
                  </div>
                  <div className="comment-content">
                    {comment.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail; 
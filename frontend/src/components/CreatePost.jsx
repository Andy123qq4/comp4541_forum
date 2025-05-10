import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CreatePost = ({ contract, account }) => {
  const [content, setContent] = useState('');
  const [tag, setTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  
  // Available tags that users can select
  const availableTags = ['student', 'professor', 'staff'];
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (!content.trim()) {
      setError('Please enter some content');
      return;
    }
    
    if (!tag) {
      setError('Please select a tag');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Call the smart contract to create a post with direct content
      const tx = await contract.createPost(content, tag);
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      // Redirect to the home page
      navigate('/');
    } catch (error) {
      console.error('Error creating post:', error);
      
      // Check if the error is because the user is banned from using this tag
      if (error.message.includes('banned from using this tag')) {
        setError('You are currently banned from using this tag');
      } else {
        setError('Failed to create post. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="create-post">
      <h1>Create a New Post</h1>
      
      {!account && (
        <div className="wallet-warning">
          Please connect your wallet to create a post
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="content">Content:</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            disabled={!account || isSubmitting}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="tag">Select a Tag:</label>
          <select
            id="tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            disabled={!account || isSubmitting}
            required
          >
            <option value="">-- Select Tag --</option>
            {availableTags.map((tagOption) => (
              <option key={tagOption} value={tagOption}>
                {tagOption}
              </option>
            ))}
          </select>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          type="submit" 
          className="submit-btn"
          disabled={!account || isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  );
};

export default CreatePost; 
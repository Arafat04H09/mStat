import { useNavigate } from "react-router-dom";

function HomePage() {
    const navigate = useNavigate(); 
    const showStats = () => {
        navigate('/insights');
      };
    
  return (
    <div>
        <button type="button" onClick ={showStats}>See Stats!</button>
    </div>
  )
};

export default HomePage
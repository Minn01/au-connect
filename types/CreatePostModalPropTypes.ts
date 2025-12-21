import PostType from "./Post";
import User from "./User";

type CreatePostModalPropTypes = {
  user: User;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialType?: string;
  enableSuccessModal: () => void;
  onPostCreated: (post: PostType) => void;
};

export default CreatePostModalPropTypes;

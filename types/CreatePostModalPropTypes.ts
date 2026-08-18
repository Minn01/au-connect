import User from "./User";
import PostType from "./Post";

type CreatePostModalPropTypes = {
  user: User;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialType?: string;
  editMode?: boolean;
  exisistingPost?: PostType;
  /** Called after a new post is created, with its public share URL, when the
   *  user opted to share it to social media. */
  onPosted?: (shareUrl: string) => void;
};

export default CreatePostModalPropTypes;

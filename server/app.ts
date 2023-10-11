import ContextConcept from "./concepts/context";
import FollowConcept from "./concepts/follow";
import FriendConcept from "./concepts/friend";
import PostConcept from "./concepts/post";
import UpvoteConcept from "./concepts/upvote";
import UserConcept from "./concepts/user";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Friend = new FriendConcept();
export const Context = new ContextConcept();
export const UpvotePost = new UpvoteConcept("upvotes_on_posts");
export const UpvoteContext = new UpvoteConcept("upvotes_on_contexts");
export const Follow = new FollowConcept();

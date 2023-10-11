import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Context, Follow, Friend, Post, UpvoteContext, UpvotePost, User, WebSession } from "./app";
import { NotFoundError } from "./concepts/errors";
import { PostDoc, PostOptions } from "./concepts/post";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import Responses from "./responses";

import { summarize } from "./helpers";

class Routes {
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string) {
    WebSession.isLoggedOut(session);
    return await User.create(username, password);
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts/all")
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      posts = await Post.getByAuthor(id);
    } else {
      posts = await Post.getPosts({});
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string, options?: PostOptions) {
    const user = WebSession.getUser(session);
    const created = await Post.create(user, content, options);

    if (created.post) {
      const summary = await summarize(created.post.content);
      await Context.create(created.post._id, summary);
    }

    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return await Post.update(_id, update);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return Post.delete(_id);
  }

  @Router.get("/posts")
  async getUserFeed(session: WebSessionDoc) {
    const u = WebSession.getUser(session);
    const following = await Follow.getFollows(u);
    return await Post.getPosts({ author: {
      $in: following
    }});
  }

  @Router.get("/friends")
  async getFriends(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.idsToUsernames(await Friend.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: WebSessionDoc, friend: string) {
    const user = WebSession.getUser(session);
    const friendId = (await User.getUserByUsername(friend))._id;
    return await Friend.removeFriend(user, friendId);
  }

  @Router.get("/friend/requests")
  async getRequests(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Responses.friendRequests(await Friend.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.sendRequest(user, toId);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.removeRequest(user, toId);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.acceptRequest(fromId, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.rejectRequest(fromId, user);
  }

  @Router.get("/follows/following")
  async getFollows(session: WebSessionDoc) {
    // Gets the users that the session user is following
    const user = WebSession.getUser(session);
    return await Follow.getFollows(user);
  }

  @Router.get("/follows/followers")
  async getFollowers(session: WebSessionDoc) {
    // Gets the users that follow the session user
    const user = WebSession.getUser(session);
    return await Follow.getFollowers(user);
  }

  @Router.post("/follows/:user")
  async follow(session: WebSessionDoc, user: string) {
    const u = WebSession.getUser(session);
    const other = (await User.getUserByUsername(user))._id;
    return await Follow.follow(u, other);
  }

  @Router.delete("/follows/:user")
  async unfollow(session: WebSessionDoc, user: string) {
    const u = WebSession.getUser(session);
    const other = (await User.getUserByUsername(user))._id;
    return await Follow.unfollow(u, other);
  }

  @Router.get("/contexts/:_id")
  async getContextsByParent(_id: ObjectId) {
    await Post.isPost(_id);
    const contexts = await Context.getByParent(new ObjectId(_id));
    return Responses.contexts(contexts);
  }

  @Router.get("/contexts")
  async getContexts() {
    const contexts = await Context.getContexts({});
    return Responses.contexts(contexts);
  }

  @Router.post("/contexts/:_id")
  async createContext(session: WebSessionDoc, _id: ObjectId, content: string) {
    const user = WebSession.getUser(session);
    await Post.isPost(_id);
    const created = await Context.create(new ObjectId(_id), content, user);
    return { msg: created.msg, context: await Responses.context(created.context) };
  }

  @Router.post("/upvotes/:_id")
  async castPostUpvote(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isPost(_id);
    return await UpvotePost.cast(user, _id);
  }

  @Router.delete("/upvotes/:_id")
  async retractPostUpvote(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isPost(_id);
    await UpvotePost.isVoter(user, _id);
    return await UpvotePost.retract(_id);
  }

  @Router.post("/upvotes/:_id")
  async castContextUpvote(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Context.isContext(_id);
    return await UpvoteContext.cast(user, _id);
  }

  @Router.delete("/upvotes/:_id")
  async retractContextUpvote(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Context.isContext(_id);
    await UpvoteContext.isVoter(user, _id);
    return await UpvoteContext.retract(_id);
  }

  @Router.get("/upvotes/:_id")
  async countUpvotes(_id: ObjectId) {
    const matchingPosts = await Post.getPosts({ _id });
    if (matchingPosts) {
      return await UpvotePost.countVotes(_id);
    }
    
    const matchingContexts = await Context.getContexts({ _id });
    if (matchingContexts) {
      return await UpvoteContext.countVotes(_id);
    }

    return new NotFoundError(`Item with id ${_id} was not found!`);
  }
}

export default getExpressRouter(new Routes());

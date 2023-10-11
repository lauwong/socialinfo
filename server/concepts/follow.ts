import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface FollowDoc extends BaseDoc {
  user: ObjectId;
  other: ObjectId;
}

export default class FollowConcept {
  public readonly follows = new DocCollection<FollowDoc>("follows");

  async follow(user: ObjectId, other: ObjectId) {

    await this.isNotFollowing(user, other);

    await this.follows.createOne({ user, other })
    return { msg: `Followed!` };
  }

  async unfollow(user: ObjectId, other: ObjectId) {
    const follow = await this.follows.readOne({ user, other });
    if (follow === null) {
      throw new FollowNotFoundError(user, other);
    }
    await this.follows.deleteOne({ user, other });
    return { msg: `Unfollowed!` };
  }

  async getFollows(user: ObjectId) {
    const follows = await this.follows.readMany({ user });
    return follows;
  }

  async getFollowers(u: ObjectId) {
    const followers = await this.follows.readMany({ other: u });
    return followers;
  }

  private async isNotFollowing(user: ObjectId, other: ObjectId) {
    const follow = await this.follows.readOne({ user, other });
    if (follow !== null || user.toString() === other.toString()) {
      throw new AlreadyFollowingError(user, other);
    }
  }
}

export class FollowNotFoundError extends NotFoundError {
  constructor(
    public readonly user: ObjectId,
    public readonly other: ObjectId,
  ) {
    super("{0} does not follow {1}!", user, other);
  }
}

export class AlreadyFollowingError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly other: ObjectId,
  ) {
    super("{0} already follows {1}!", user, other);
  }
}
